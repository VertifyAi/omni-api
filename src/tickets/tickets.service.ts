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
import { ChatWithVerAiDto } from 'src/verai/dto/chat-with-verai.dto';

@Injectable()
export class TicketsService {
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
  ) {}

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
    );

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    let customer = await this.customersService.findOneByPhone(
      createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
    );

    if (!customer) {
      customer = await this.customersService.create({
        phone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        name: createTicketMessageDto.entry[0].changes[0].value.contacts[0]
          .profile.name,
      } as CreateCustomerDto);
    }

    let ticket = await this.ticketRepository.findOneBy({
      customerId: customer.id,
    });

    if (!ticket) {
      ticket = this.ticketRepository.create({
        status: TicketStatus.AI,
        customerId: customer.id,
        companyId: company.id,
        agentId: agent.id,
        channel:
          createTicketMessageDto.entry[0].changes[0].value.messaging_product,
      });
      await this.ticketRepository.save(ticket);
      this.chatGateway.emitNewTicket(ticket.id);
    }

    const ticketMessage = this.ticketMessageRepository.create({
      phone: createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
      message:
        createTicketMessageDto.entry[0].changes[0].value.messages[0].text.body,
      senderName:
        createTicketMessageDto.entry[0].changes[0].value.contacts[0].profile
          .name,
      ticketId: ticket.id,
      sender: TicketMessageSender.CUSTOMER,
    });
    await this.ticketMessageRepository.save(ticketMessage);

    try {
      if (ticket.status === TicketStatus.AI) {
        // await lastValueFrom(
        //   this.httpService.post(
        //     'https://n8n.vertify.com.br/webhook-test/7e33648b-9146-466f-ae26-cd8959fc729e',
        //     {
        //       ...ticketMessage,
        //       type: createTicketMessageDto.entry[0].changes[0].value.messages[0]
        //         .type,
        //       companyId: company.id,
        //       agentId: agent.id,
        //     },
        //   ),
        // );

        await this.veraiService.chat({
          conversationId: ticket.id,
          message:
            createTicketMessageDto.entry[0].changes[0].value.messages[0].text
              .body,
        } as ChatWithVerAiDto);
      }
      this.chatGateway.emitNewMessage(ticketMessage);
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }

  async findAllTickets(companyId: number): Promise<Ticket[]> {
    return await this.ticketRepository.find({
      where: {
        companyId,
      },
      relations: ['company', 'customer', 'ticketMessages'],
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
      relations: ['agent', 'customer'],
    });

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

    const user = await this.usersService.findOneById(currentUser.id);

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
}
