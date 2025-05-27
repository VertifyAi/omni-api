import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import {
  TicketMessage,
  TicketMessageSender,
} from './entities/ticket-message.entity';
import { WhatsappWebhookDto } from '../webhook/dto/handle-incoming-message.dto';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateAITicketMessageDto } from './dto/create-ai-ticket-message.dto';
import { AgentsService } from 'src/agents/agents.service';
import { ChatGateway } from 'src/gateway/chat.gateway';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { SendMessageDto } from './dto/send-message.dto';
import { VeraiService } from 'src/verai/verai.service';
import { Team } from 'src/teams/entities/teams.entity';
import { TeamsService } from 'src/teams/teams.service';
// import { ChatWithVerAiDto } from 'src/verai/dto/chat-with-verai.dto';

interface MessageBuffer {
  messages: string[];
  timer: NodeJS.Timeout;
  customerId: number;
  companyId: number;
  agentId: number;
  channel: string;
  customerName: string;
  customerPhone: string;
  newCustomer: boolean;
  agentConfig: string;
  agentSystemMessage: string;
  teams: Team[];
}

@Injectable()
export class TicketsService {
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private readonly BUFFER_TIMEOUT = 10000; // 10 segundos

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
    private readonly httpService: HttpService,
    private readonly chatGateway: ChatGateway,
    private readonly veraiService: VeraiService,
    private readonly teamsService: TeamsService,
  ) {}

  private async processBufferedMessages(bufferKey: string) {
    console.log('processBufferedMessages', bufferKey);
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;
    this.messageBuffers.delete(bufferKey);

    let ticket = await this.ticketRepository.findOneBy({
      customerId: buffer.customerId,
    });

    let newTicket = false;
    if (!ticket) {
      ticket = this.ticketRepository.create({
        status: TicketStatus.AI,
        customerId: buffer.customerId,
        companyId: buffer.companyId,
        agentId: buffer.agentId,
        channel: buffer.channel,
      });
      await this.ticketRepository.save(ticket);
      this.chatGateway.emitNewTicket(ticket.id);
      newTicket = true;
    }

    // Processa cada mensagem individualmente
    for (const message of buffer.messages) {
      const ticketMessage = this.ticketMessageRepository.create({
        phone: buffer.customerPhone,
        message: message,
        senderName: buffer.customerName,
        ticketId: ticket.id,
        sender: TicketMessageSender.CUSTOMER,
      });
      await this.ticketMessageRepository.save(ticketMessage);
      this.chatGateway.emitNewMessage(ticketMessage);
    }

    try {
      if (ticket.status === TicketStatus.AI) {
        // Envia a última mensagem para o webhook
        const lastMessage = buffer.messages[buffer.messages.length - 1];
        await lastValueFrom(
          this.httpService.post(
            'https://n8n.vertify.com.br/webhook/7e33648b-9146-466f-ae26-cd8959fc729e',
            {
              phone: buffer.customerPhone,
              message: lastMessage,
              senderName: buffer.customerName,
              ticketId: ticket.id,
              sender: TicketMessageSender.CUSTOMER,
              type: 'text',
              companyId: buffer.companyId,
              agentId: buffer.agentId,
              newTicket,
              newCustomer: buffer.newCustomer,
              state: ticket.state || {},
              agentConfig: buffer.agentConfig,
              agentSystemMessage: buffer.agentSystemMessage,
              teams: buffer.teams,
            },
          ),
        );
      }
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }

  async handleIncomingMessage(
    createTicketMessageDto: WhatsappWebhookDto,
  ): Promise<void> {
    const company = await this.companiesService.findCompanyByPhone(
      createTicketMessageDto.entry[0].changes[0].value.metadata
        .display_phone_number,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const agent = await this.agentsService.findOneAgentByWhatsappNumber(
      createTicketMessageDto.entry[0].changes[0].value.metadata
        .display_phone_number,
      company.id,
    );

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    console.log('antes de buscar o customer');
    let customer = await this.customersService.findOneByPhone(
      createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
      company.id,
    );

    let newCustomer = false;
    if (!customer) {
      customer = await this.customersService.create({
        phone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        name: createTicketMessageDto.entry[0].changes[0].value.contacts[0]
          .profile.name,
        companyId: company.id,
      } as CreateCustomerDto);
      newCustomer = true;
    }

    const message =
      createTicketMessageDto.entry[0].changes[0].value.messages[0].text.body;
    const bufferKey = `${customer.id}-${company.id}`;

    // Se já existe um buffer para este cliente/empresa
    if (this.messageBuffers.has(bufferKey)) {
      const buffer = this.messageBuffers.get(bufferKey);
      if (buffer) {
        buffer.messages.push(message);
        clearTimeout(buffer.timer);
        buffer.timer = setTimeout(() => {
          this.processBufferedMessages(bufferKey);
        }, this.BUFFER_TIMEOUT);
      }
    } else {
      const buffer: MessageBuffer = {
        messages: [message],
        timer: setTimeout(() => {
          this.processBufferedMessages(bufferKey);
        }, this.BUFFER_TIMEOUT),
        customerId: customer.id,
        companyId: company.id,
        agentId: agent.id,
        agentConfig: agent.config,
        agentSystemMessage: agent.systemMessage,
        channel:
          createTicketMessageDto.entry[0].changes[0].value.messaging_product,
        customerName:
          createTicketMessageDto.entry[0].changes[0].value.contacts[0].profile
            .name,
        customerPhone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        newCustomer,
        teams: company.teams,
      };
      this.messageBuffers.set(bufferKey, buffer);
    }
  }

  async findAllTickets(companyId: number): Promise<Ticket[]> {
    return await this.ticketRepository.find({
      where: {
        companyId,
      },
      relations: {
        company: true,
        customer: true,
        ticketMessages: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async createAITicketMessage(
    createAITicketMessage: CreateAITicketMessageDto,
  ): Promise<void> {
    const ticket = await this.ticketRepository.findOne({
      where: {
        id: createAITicketMessage.ticketId,
      },
      relations: ['agent', 'customer', 'company'],
    });

    console.log('ticket', ticket);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: ticket.customer.phone,
      type: 'text',
      text: {
        body: `*${ticket.agent.name}*\n\n${createAITicketMessage.content}`,
      },
    };

    try {
      await lastValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
          whatsappPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const ticketMessage = this.ticketMessageRepository.create({
        phone: ticket.agent.whatsappNumber,
        message: createAITicketMessage.content,
        ticketId: createAITicketMessage.ticketId,
        senderName: ticket.agent.name,
        sender: TicketMessageSender.AI,
      });
      this.chatGateway.emitNewMessage(ticketMessage);
      await this.ticketMessageRepository.save(ticketMessage);
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem para WhatsApp:',
        error.response?.data || error.message,
      );
      throw new Error('Falha ao enviar mensagem pelo WhatsApp.');
    }
  }

  async findMessagesByTicket(ticketId: number): Promise<TicketMessage[]> {
    return await this.ticketMessageRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  async changeTicketStatus(
    changeTicketStatusDto: ChangeTicketStatusDto,
    currentUser: User,
    ticketId: number,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: {
        id: ticketId,
        companyId: currentUser.companyId,
      },
      relations: ['customer', 'agent'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.usersService.findOneById(
      currentUser.id,
      currentUser.companyId,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const messageContent = `A partir deste momento, nosso agente humano ${user.name} assumirá a conversa para te auxiliar com ainda mais atenção. Foi um prazer te ajudar até aqui!`;

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: ticket.customer.phone,
      type: 'text',
      text: {
        body: messageContent,
      },
    };

    try {
      await lastValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
          whatsappPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const ticketMessage = this.ticketMessageRepository.create({
        phone: ticket.agent.whatsappNumber,
        message: messageContent,
        ticketId: ticket.id,
        senderName: ticket.agent.name,
        sender: TicketMessageSender.AI,
      });
      this.chatGateway.emitNewMessage(ticketMessage);
      await this.ticketMessageRepository.save(ticketMessage);
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem para WhatsApp:',
        error.response?.data || error.message,
      );
      throw new Error('Falha ao enviar mensagem pelo WhatsApp.');
    }

    return await this.ticketRepository.save({
      ...ticket,
      status: changeTicketStatusDto.status,
    });
  }

  async sendMessage(
    ticketId: number,
    sendMessageDto: SendMessageDto,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['customer'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const ticketMessage = this.ticketMessageRepository.create({
      phone: sendMessageDto.phone,
      message: sendMessageDto.message,
      senderName: sendMessageDto.name,
      ticketId,
      sender: TicketMessageSender.USER,
    });

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: ticket.customer.phone,
      type: 'text',
      text: {
        body: sendMessageDto.message,
      },
    };
    try {
      await lastValueFrom(
        this.httpService.post(
          `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
          whatsappPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem para WhatsApp:',
        error.response?.data || error.message,
      );
      throw new Error('Falha ao enviar mensagem pelo WhatsApp.');
    }

    await this.ticketMessageRepository.save(ticketMessage);
    this.chatGateway.emitNewMessage(ticketMessage);

    return ticketMessage;
  }

  async changeTicketStatusByAgent(
    changeTicketStatusDto: ChangeTicketStatusDto,
    ticketId: number,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: {
        id: ticketId,
        companyId: changeTicketStatusDto.companyId,
      },
      relations: ['customer', 'agent'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const team = await this.teamsService.findOneByName(
      changeTicketStatusDto.teamName,
    );

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return await this.ticketRepository.save({
      ...ticket,
      status: changeTicketStatusDto.status,
      teamId: team.id,
    });
  }
}
