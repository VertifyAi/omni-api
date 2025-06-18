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
import { TeamsService } from 'src/teams/teams.service';
import { OpenAIService } from 'src/integrations/openai/openai.service';
import { OpenAIChatMessage } from 'src/utils/types/openai.types';
import { GetAnalyticsDto } from 'src/analytics/dto/get-analytics.dto';
import { Customer } from 'src/customers/entities/customer.entity';
import { WorkflowsService } from 'src/workflows/workflows.service';
import { Workflow } from 'src/workflows/entities/workflow.entity';
// import { ChatWithVerAiDto } from 'src/verai/dto/chat-with-verai.dto';

interface MessageBuffer {
  messages: string[];
  timer: NodeJS.Timeout;
  customerId: number;
  companyId: number;
  channel: string;
  customerName: string;
  customerPhone: string;
  newCustomer: boolean;
  customer: Customer;
  workflow: Workflow;
  senderIdentifier: string;
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
    private readonly workflowsService: WorkflowsService,
  ) {}

  async handleIncomingMessage(
    createTicketMessageDto: WhatsappWebhookDto,
  ): Promise<void> {
    const workflow =
      await this.workflowsService.findOneWorkflowByChannelIdentifier(
        createTicketMessageDto.entry[0].changes[0].value.metadata
          .display_phone_number,
      );

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    let customer = await this.customersService.findOneByPhone(
      createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
      workflow.companyId,
    );

    if (!customer) {
      customer = await this.customersService.create({
        phone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        name: createTicketMessageDto.entry[0].changes[0].value.contacts[0]
          .profile.name,
        companyId: workflow.companyId,
      } as CreateCustomerDto);
    }

    const message =
      createTicketMessageDto.entry[0].changes[0].value.messages[0].text.body;
    const bufferKey = `${customer.id}-${workflow.companyId}`;

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
        companyId: workflow.companyId,
        workflow: workflow,
        senderIdentifier:
          createTicketMessageDto.entry[0].changes[0].value.metadata
            .display_phone_number,
        channel:
          createTicketMessageDto.entry[0].changes[0].value.messaging_product,
        customerName:
          createTicketMessageDto.entry[0].changes[0].value.contacts[0].profile
            .name,
        customerPhone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        newCustomer: false,
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
        senderIdentifier: createAITicketMessage.senderIdentifier,
        message: createAITicketMessage.content,
        ticketId: createAITicketMessage.ticketId,
        senderName: ticket.agent.name,
        senderType: TicketMessageSender.AI,
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
        message: messageContent,
        ticketId: ticket.id,
        senderName: ticket.agent.name,
        senderType: TicketMessageSender.AI,
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
      senderType: TicketMessageSender.USER,
      senderIdentifier: "OMNI",
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

  /**
   * Cria uma nova mensagem para um ticket
   * @param senderIdentifier Identificador do remetente
   * @param ticketId ID do ticket
   * @param message Conteúdo da mensagem
   * @param sender Tipo de remetente
   * @param senderName Nome do remetente
   */
  private async createNewMessage(
    senderIdentifier: string,
    ticketId: number,
    message: string,
    senderType: TicketMessageSender,
    senderName: string,
  ) {
    const ticketMessage = this.ticketMessageRepository.create({
      senderIdentifier,
      message,
      ticketId,
      senderName,
      senderType,
    });
    await this.ticketMessageRepository.save(ticketMessage);
    this.chatGateway.emitNewMessage(ticketMessage);
    return ticketMessage;
  }

  /**
   * Solicita a assistência humana para um ticket
   * @param ticketId ID do ticket
   * @param args Prioridade e equipe alvo
   */
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

    const messageContent = `A partir deste momento, nossa equipe ${team.name} assumirá a conversa para te auxiliar com ainda mais atenção. Foi um prazer te ajudar até aqui!`;

    await this.createNewMessage(
      ticket.customer.phone,
      ticket.id,
      messageContent,
      TicketMessageSender.AI,
      'Omni AI',
    );

    return await this.ticketRepository.save({
      ...ticket,
      status: TicketStatus.IN_PROGRESS,
      areaId: team.id,
      priorityLevel: args.priority_level,
    });
  }

  /**
   * Cria um novo ticket com base no buffer de mensagens
   * @param buffer Buffer de mensagens
   * @returns Ticket criado
   */
  private async createNewTicket(buffer: MessageBuffer): Promise<Ticket> {
    const messagesArray: OpenAIChatMessage[] = [];
    const { workflowAgent, workflowTeam, workflowUser } = buffer.workflow;
    const ticket: Ticket = this.ticketRepository.create({
      status: workflowAgent?.id ? TicketStatus.AI : TicketStatus.IN_PROGRESS,
      customerId: buffer.customerId,
      companyId: buffer.companyId,
      channel: buffer.channel,
      areaId: workflowTeam?.id ? workflowTeam?.id : undefined,
      userId: workflowUser?.id ? workflowUser?.id : undefined,
      agentId: workflowAgent?.id ? workflowAgent?.id : undefined,
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
    return ticket;
  }

  /**
   * Processa as mensagens armazenadas no buffer
   * @param bufferKey Chave do buffer
   */
  private async processBufferedMessages(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;
    this.messageBuffers.delete(bufferKey);

    let ticket: Ticket | null = await this.ticketRepository.findOneBy({
      customerId: buffer.customerId,
    });

    let newTicket = false;
    if (!ticket) {
      ticket = await this.createNewTicket(buffer);
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
        buffer.workflow.workflowAgent?.llmAssistantId || 'gpt-4o-mini',
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
            senderIdentifier: buffer.senderIdentifier,
            content: message.content,
            ticketId: ticket.id,
          });
        }
      }
    }
  }
}
