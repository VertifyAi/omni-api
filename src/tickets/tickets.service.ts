import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, In, FindOptionsWhere } from 'typeorm';
import {
  Ticket,
  TicketPriorityLevel,
  TicketStatus,
} from './entities/ticket.entity';
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
import { User, UserRole } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { SendMessageDto } from './dto/send-message.dto';
import { VeraiService } from 'src/verai/verai.service';
import { Team } from 'src/teams/entities/teams.entity';
import { TeamsService } from 'src/teams/teams.service';
import { OpenAIService } from 'src/integrations/openai/openai.service';
import { OpenAIChatMessage } from 'src/utils/types/openai.types';
import { GetAnalyticsDto } from 'src/analytics/dto/get-analytics.dto';
import { Customer } from 'src/customers/entities/customer.entity';
// import { ChatWithVerAiDto } from 'src/verai/dto/chat-with-verai.dto';

interface MessageBuffer {
  messages: string[];
  timer: NodeJS.Timeout;
  customerId: number;
  companyId: number;
  // agentId: number;
  channel: string;
  customerName: string;
  customerPhone: string;
  newCustomer: boolean;
  // agentConfig: string;
  // agentSystemMessage: string;
  // agentName: string;
  // agentLlmAssistantId: string;
  teams: Team[];
  customer: Customer;
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
    private readonly llmService: OpenAIService,
  ) {}

  private async processBufferedMessages(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;
    this.messageBuffers.delete(bufferKey);

    let ticket = await this.ticketRepository.findOneBy({
      customerId: buffer.customerId,
    });

    let newTicket = false;
    const messagesArray: OpenAIChatMessage[] = [];
    if (!ticket) {
      ticket = this.ticketRepository.create({
        status: TicketStatus.AI,
        customerId: buffer.customerId,
        companyId: buffer.companyId,
        // agentId: buffer.agentId,
        channel: buffer.channel,
      });
      buffer.messages.forEach((message) => {
        messagesArray.push({
          role: 'user',
          content: message,
        });
      });
      const llmThread = await this.llmService.createThreads(messagesArray, {
        companyId: String(buffer.companyId),
      });
      ticket.llmThreadId = llmThread.id;
      await this.ticketRepository.save(ticket);
      newTicket = true;
    }

    const ticketMessages: TicketMessage[] = [];
    for (const message of buffer.messages) {
      ticketMessages.push(
        await this.createNewMessage(
          buffer.customerPhone,
          ticket.id,
          message,
          TicketMessageSender.CUSTOMER,
          buffer.customerName,
        ),
      );
    }

    if (newTicket) {
      this.chatGateway.emitNewTicket({
        ...ticket,
        ticketMessages,
        customer: buffer.customer,
      });
    }

    if (ticket.status === TicketStatus.AI) {
      let concatenatedMessages = '';
      buffer.messages.forEach(async (message) => {
        concatenatedMessages += message + '\n';
      });

      await this.llmService.createMessage(ticket.llmThreadId, {
        role: 'user',
        content: concatenatedMessages,
      });

      const llmAgentMessage = await this.llmService.createAndStreamRun(
        ticket.llmThreadId,
        // buffer.agentLlmAssistantId,
        'gpt-4o-mini',
      );

      if (
        typeof llmAgentMessage === 'object' &&
        llmAgentMessage !== null &&
        'action' in llmAgentMessage
      ) {
        switch (llmAgentMessage.action) {
          case 'request_human_assistance':
            const llmAgentMessageWithEnum = {
              ...llmAgentMessage,
              priority_level:
                llmAgentMessage.priority_level === 'low'
                  ? TicketPriorityLevel.LOW
                  : llmAgentMessage.priority_level === 'medium'
                    ? TicketPriorityLevel.MEDIUM
                    : llmAgentMessage.priority_level === 'high'
                      ? TicketPriorityLevel.HIGH
                      : TicketPriorityLevel.CRITICAL,
            };
            await this.requestHumanAssistance(
              ticket.id,
              llmAgentMessageWithEnum,
            );
            break;
          default:
            break;
        }
      } else {
        const jsonMessage = JSON.parse(llmAgentMessage as string);
        for (const message of jsonMessage.messages) {
          await this.createAITicketMessage({
            content: message.content,
            ticketId: ticket.id,
          });
        }
      }
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

    // const agent = await this.agentsService.findOneAgentByWhatsappNumber(
    //   createTicketMessageDto.entry[0].changes[0].value.metadata
    //     .display_phone_number,
    //   company.id,
    // );

    // if (!agent) {
    //   throw new NotFoundException('Agent not found');
    // }

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
        customer: customer,
        companyId: company.id,
        // agentId: agent.id,
        // agentConfig: agent.config,
        // agentSystemMessage: agent.systemMessage,
        // agentName: agent.name,
        // agentLlmAssistantId: agent.llmAssistantId,
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

  async findAllTickets(currentUser: User): Promise<Ticket[]> {
    let where: FindOptionsWhere<Ticket> = {
      companyId: currentUser.companyId,
    };

    if (currentUser.role === UserRole.USER) {
      where = {
        ...where,
        userId: In([currentUser.id || 0, 0]),
        areaId: currentUser.areaId,
      };
    } else if (currentUser.role === UserRole.MANAGER) {
      where = {
        ...where,
        areaId: currentUser.areaId,
      };
    }

    return await this.ticketRepository.find({
      where,
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
        // phone: ticket.agent.whatsappNumber,
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

    const messageContent = `A partir deste momento, nosso agente humano ${currentUser.name} assumirá a conversa para te auxiliar com ainda mais atenção. Foi um prazer te ajudar até aqui!`;

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
        // phone: ticket.agent.whatsappNumber,
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
    currentUser: User,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['customer', 'agent'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const ticketMessage = this.ticketMessageRepository.create({
      message: sendMessageDto.message,
      senderName: currentUser.name,
      ticketId,
      sender: TicketMessageSender.USER,
    });

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: ticket.customer.phone,
      type: 'text',
      text: {
        body: `*${currentUser.name}*\n\n${sendMessageDto.message}`,
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

  async getTicketsAnalytics(
    getAnalyticsDto: GetAnalyticsDto,
    companyId: number,
  ) {
    const where = {
      companyId,
      createdAt: Between(
        new Date(getAnalyticsDto.startDate),
        new Date(getAnalyticsDto.endDate),
      ),
    };

    if (getAnalyticsDto.teamId) {
      where['teamId'] = getAnalyticsDto.teamId;
    }

    if (getAnalyticsDto.userId) {
      where['userId'] = getAnalyticsDto.userId;
    }

    return await this.ticketRepository.find({
      where,
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

  private async createNewMessage(
    phone: string,
    ticketId: number,
    message: string,
    sender: TicketMessageSender,
    senderName: string,
  ) {
    const ticketMessage = this.ticketMessageRepository.create({
      phone,
      message,
      ticketId,
      senderName,
      sender,
    });
    await this.ticketMessageRepository.save(ticketMessage);
    this.chatGateway.emitNewMessage(ticketMessage);
    return ticketMessage;
  }

  private async requestHumanAssistance(
    ticketId: number,
    args: { priority_level: TicketPriorityLevel; target_team: string },
  ) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['customer', 'agent'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const team = await this.teamsService.findOneByName(
      args.target_team,
      ticket.companyId,
    );

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return await this.ticketRepository.save({
      ...ticket,
      status: TicketStatus.IN_PROGRESS,
      areaId: team.id,
      priorityLevel: args.priority_level,
    });
  }
}
