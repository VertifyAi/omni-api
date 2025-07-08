import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, In, FindOptionsWhere, IsNull } from 'typeorm';
import {
  Ticket,
  TicketPriorityLevel,
  TicketStatus,
} from './entities/ticket.entity';
import {
  TicketMessage,
  TicketMessageSender,
  TicketMessageType,
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
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { S3Service } from 'src/integrations/aws/s3.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateTicketDto } from './dto/update-ticket.dto';

interface MessageData {
  content: string;
  type: TicketMessageType;
  audioUrl?: string;
}

interface MessageBuffer {
  messages: MessageData[];
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
  private readonly BUFFER_TIMEOUT = 15000; // 15 segundos

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
    private readonly s3Service: S3Service,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Lida com uma mensagem recebida pelo WhatsApp
   * @param createTicketMessageDto Dados da mensagem
   */
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

    const messageData =
      createTicketMessageDto.entry[0].changes[0].value.messages[0];
    let message: string;

    // Verifica se é áudio ou texto
    let messageObj: MessageData;
    if (messageData.type === 'audio' && messageData.audio) {
      const audioResult = await this.processAudioMessage(
        messageData.audio.id,
        customer.id,
        createTicketMessageDto.entry[0].changes[0].value.contacts[0].profile
          .name,
        createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        workflow.companyId,
      );

      messageObj = {
        content: audioResult.transcription,
        type: TicketMessageType.TEXT, // Para processamento da IA
        audioUrl: audioResult.s3AudioUrl,
      };

      message = audioResult.transcription;
    } else if (messageData.type === 'text' && messageData.text) {
      message = messageData.text.body;
      messageObj = {
        content: message,
        type: TicketMessageType.TEXT,
      };
    } else {
      throw new Error('Tipo de mensagem não suportado');
    }

    // Verifica se é uma avaliação (número de 1 a 5)
    const isRating = this.isRatingMessage(message);
    if (isRating) {
      const recentClosedTicket = await this.findRecentClosedTicketWithoutScore(
        customer.id,
        workflow.companyId,
      );

      if (recentClosedTicket) {
        await this.updateTicketScore(recentClosedTicket.id, isRating);
        await this.sendRatingConfirmationMessage(recentClosedTicket, isRating);
        return;
      }
    }

    const bufferKey = `${customer.id}-${workflow.companyId}`;

    if (this.messageBuffers.has(bufferKey)) {
      const buffer = this.messageBuffers.get(bufferKey);
      if (buffer) {
        buffer.messages.push(messageObj);
        clearTimeout(buffer.timer);
        buffer.timer = setTimeout(() => {
          this.processBufferedMessages(bufferKey);
        }, this.BUFFER_TIMEOUT);
      }
    } else {
      const buffer: MessageBuffer = {
        messages: [messageObj],
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

  /**
   * Faz download do áudio da URL temporária
   * @param audioUrl URL temporária do áudio
   * @returns Buffer do áudio
   */
  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.get(audioUrl, {
          headers: {
            Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
          },
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(data);
    } catch (error) {
      console.error('Erro ao fazer download do áudio:', error);
      throw new Error('Falha ao fazer download do áudio');
    }
  }

  /**
   * Obtém todos os tickets
   * @param currentUser Usuário atual
   * @returns Tickets
   */
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

  /**
   * Cria uma mensagem para um ticket
   * @param createAITicketMessage Dados da mensagem
   */
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

    try {
      await this.sendMessageToWhatsapp(
        ticket,
        createAITicketMessage.content,
        ticket.agent.name,
      );

      const ticketMessage = this.ticketMessageRepository.create({
        senderIdentifier: createAITicketMessage.senderIdentifier,
        message: createAITicketMessage.content,
        ticketId: createAITicketMessage.ticketId,
        senderName: ticket.agent.name,
        senderType: TicketMessageSender.AI,
        messageType: TicketMessageType.TEXT,
      });
      this.chatGateway.emitNewMessage({
        ...ticketMessage,
        createdAt: new Date(),
      });
      await this.ticketMessageRepository.save(ticketMessage);
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem para WhatsApp:',
        error.response?.data || error.message,
      );
      throw new Error('Falha ao enviar mensagem pelo WhatsApp.');
    }
  }

  /**
   * Obtém as mensagens de um ticket
   * @param ticketId ID do ticket
   * @returns Mensagens do ticket
   */
  async findMessagesByTicket(ticketId: number): Promise<TicketMessage[]> {
    return await this.ticketMessageRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Altera o status de um ticket
   * @param changeTicketStatusDto Dados da alteração do status
   * @param currentUser Usuário atual
   * @param ticketId ID do ticket
   * @returns Ticket atualizado
   */
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

    const oldStatus = ticket.status;
    const messageContent = await this.chooseMessageToSendWhenTicketIsChanged(
      changeTicketStatusDto,
      currentUser,
    );

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
        senderName: ticket.agent?.name || currentUser.name,
        senderType: TicketMessageSender.AI,
        senderIdentifier: 'OMNI',
        messageType: TicketMessageType.TEXT,
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

    // Atualizar propriedades do ticket
    ticket.status = changeTicketStatusDto.status;
    ticket.userId = changeTicketStatusDto.userId;
    ticket.priorityLevel = changeTicketStatusDto.priorityLevel;

    if (changeTicketStatusDto.status === TicketStatus.CLOSED) {
      ticket.closedAt = new Date();
    }

    const updatedTicket = await this.ticketRepository.save(ticket);

    // Emitir evento de mudança de status
    this.eventEmitter.emit('ticket.status.changed', {
      ticketId: updatedTicket.id,
      companyId: updatedTicket.companyId,
      newStatus: changeTicketStatusDto.status,
      oldStatus: oldStatus,
      changedByUserName: currentUser.name,
      messageSentToCustomer: messageContent,
      freshdeskTicketId: updatedTicket.freshdeskTicketId,
      newPriorityLevel: changeTicketStatusDto.priorityLevel,
    });

    return updatedTicket;
  }

  /**
   * Envia uma mensagem para um ticket
   * @param ticketId ID do ticket
   * @param sendMessageDto Dados da mensagem
   * @param currentUser Usuário atual
   * @returns Mensagem enviada
   */
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
      senderIdentifier: 'OMNI',
      messageType: TicketMessageType.TEXT,
    });

    await this.sendMessageToWhatsapp(
      ticket,
      sendMessageDto.message,
      currentUser.name,
    );

    await this.ticketMessageRepository.save(ticketMessage);
    this.chatGateway.emitNewMessage(ticketMessage);

    return ticketMessage;
  }

  /**
   * Obtém os dados de análise de tickets
   * @param getAnalyticsDto Dados de análise
   * @param companyId ID da empresa
   * @returns Dados de análise
   */
  async getTicketsAnalytics(
    getAnalyticsDto: GetAnalyticsDto,
    companyId: number,
  ) {
    // Garantir que ambas as datas tenham valores válidos
    if (!getAnalyticsDto.startDate) {
      getAnalyticsDto.startDate = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    if (!getAnalyticsDto.endDate) {
      getAnalyticsDto.endDate = new Date(Date.now()).toISOString();
    }

    const where = {
      companyId,
      createdAt: Between(
        new Date(getAnalyticsDto.startDate),
        new Date(getAnalyticsDto.endDate),
      ),
    };

    if (getAnalyticsDto.teamId) {
      where['areaId'] = parseInt(getAnalyticsDto.teamId);
    }

    const tickets = await this.ticketRepository.find({
      where,
      relations: {
        company: true,
        customer: true,
        ticketMessages: true,
        area: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const previousPeriodStart = new Date(getAnalyticsDto.startDate);
    previousPeriodStart.setDate(
      previousPeriodStart.getDate() -
        new Date(getAnalyticsDto.startDate).getDate(),
    );
    const previousPeriodEnd = new Date(getAnalyticsDto.endDate);
    previousPeriodEnd.setDate(
      previousPeriodEnd.getDate() - new Date(getAnalyticsDto.endDate).getDate(),
    );

    const previousPeriodWhere = {
      companyId,
      status: TicketStatus.CLOSED,
      createdAt: Between(previousPeriodStart, previousPeriodEnd),
    };

    if (getAnalyticsDto.teamId) {
      previousPeriodWhere['areaId'] = parseInt(getAnalyticsDto.teamId);
    }

    const previousPeriodTickets = await this.ticketRepository.find({
      where: previousPeriodWhere,
    });

    return {
      tickets,
      previousPeriodTickets,
    };
  }

  /**
   * Calcula o tempo médio de resolução de tickets humanos
   * @param companyId ID da empresa
   * @param startDate Data de início
   * @param endDate Data de fim
   * @returns Tempo médio de resolução de tickets humanos
   */
  async calculateAverageHumanResolutionTime(
    companyId: number,
    startDate: Date,
    endDate: Date,
    teamId?: string,
  ) {
    const where = {
      companyId,
      status: TicketStatus.CLOSED,
      agentId: IsNull(),
      createdAt: Between(startDate, endDate),
    };

    if (teamId) {
      where['areaId'] = parseInt(teamId);
    }

    const tickets = await this.ticketRepository.find({
      where,
    });

    // Calcular o tempo médio em de resolução de tickets humanos
    const totalTime = tickets.reduce((acc, ticket) => {
      if (ticket.closedAt && ticket.createdAt) {
        const time = ticket.closedAt.getTime() - ticket.createdAt.getTime();
        return acc + time;
      }
      return acc;
    }, 0);

    return totalTime / tickets.length;
  }

  /**
   * Transfere um ticket para um novo agente ou equipe
   * @param transferTicketDto Dados da transferência
   * @param currentUser Usuário atual
   * @param ticketId ID do ticket
   */
  async transferTicket(
    transferTicketDto: TransferTicketDto,
    currentUser: User,
    ticketId: number,
  ) {
    // Usar QueryBuilder para controle total sobre o UPDATE
    let updateQuery = this.ticketRepository
      .createQueryBuilder()
      .update(Ticket)
      .where('id = :ticketId', { ticketId });

    if (transferTicketDto.userId) {
      const user = await this.usersService.findOneById(
        transferTicketDto.userId,
        currentUser.companyId,
      );
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Transferir para usuário: limpar area e agent, definir user
      updateQuery = updateQuery.set({
        userId: user.id,
        areaId: () => 'NULL',
        agentId: () => 'NULL',
        priorityLevel: transferTicketDto.priorityLevel,
        status: TicketStatus.IN_PROGRESS,
      });
    } else if (transferTicketDto.teamId) {
      const team = await this.teamsService.findOneById(
        transferTicketDto.teamId,
        currentUser.companyId,
      );
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // Transferir para área: limpar user e agent, definir area
      updateQuery = updateQuery.set({
        areaId: team.id,
        userId: () => 'NULL',
        agentId: () => 'NULL',
        priorityLevel: transferTicketDto.priorityLevel,
        status: TicketStatus.IN_PROGRESS,
      });
    } else if (transferTicketDto.agentId) {
      const agent = await this.agentsService.findOneById(
        transferTicketDto.agentId,
        currentUser.companyId,
      );
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }

      // Transferir para agente: limpar area e user, definir agent
      updateQuery = updateQuery.set({
        agentId: agent.id,
        areaId: () => 'NULL',
        userId: () => 'NULL',
        priorityLevel: transferTicketDto.priorityLevel,
        status: TicketStatus.AI,
      });
    }

    return await updateQuery.execute();
  }

  /**
   * Atualiza um ticket
   * @param ticketId ID do ticket
   * @param updateTicketDto Dados da atualização
   */
  async updateTicket(
    ticketId: number,
    updateTicketDto: Partial<UpdateTicketDto>,
  ) {
    return await this.ticketRepository.update(ticketId, updateTicketDto);
  }

  /**
   * Obtém a URL temporária do áudio do WhatsApp
   * @param audioId ID do áudio
   * @returns URL temporária para download
   */
  private async getWhatsAppAudioUrl(audioId: string): Promise<string> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.get(`https://graph.facebook.com/v23.0/${audioId}`, {
          headers: {
            Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
          },
        }),
      );

      return data.url;
    } catch (error) {
      console.error('Erro ao obter URL do áudio:', error);
      throw new Error('Falha ao obter URL do áudio do WhatsApp');
    }
  }

  /**
   * Processa uma mensagem de áudio do WhatsApp
   * @param audioId ID do áudio no WhatsApp
   * @param customerId ID do cliente
   * @param customerName Nome do cliente
   * @param customerPhone Telefone do cliente
   * @param ticketId ID do ticket (se existir)
   * @returns Objeto com transcrição e URL do S3
   */
  private async processAudioMessage(
    audioId: string,
    customerId: number,
    customerName: string,
    customerPhone: string,
    companyId: number,
    ticketId?: number,
  ): Promise<{ transcription: string; s3AudioUrl: string }> {
    try {
      // 1. Obter URL temporária do áudio
      const audioUrl = await this.getWhatsAppAudioUrl(audioId);

      // 2. Fazer download do áudio
      const audioBuffer = await this.downloadAudio(audioUrl);

      // 3. Salvar no S3
      const fileName = `audio_${audioId}_${Date.now()}.ogg`;
      const s3AudioUrl = await this.s3Service.uploadAudioFile(
        audioBuffer,
        fileName,
      );

      // 4. Salvar mensagem de áudio no banco se já tiver ticket
      if (ticketId) {
        await this.createNewMessage(
          customerPhone,
          ticketId,
          s3AudioUrl,
          TicketMessageSender.CUSTOMER,
          customerName,
          TicketMessageType.AUDIO,
          companyId,
        );
      }

      // 5. Transcrever com OpenAI
      const transcription = await this.llmService.transcribeAudio(
        audioBuffer,
        fileName,
      );

      return { transcription, s3AudioUrl };
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      throw new Error('Falha ao processar mensagem de áudio');
    }
  }

  /**
   * Cria uma nova mensagem para um ticket
   * @param senderIdentifier Identificador do remetente
   * @param ticketId ID do ticket
   * @param message Conteúdo da mensagem
   * @param sender Tipo de remetente
   * @param senderName Nome do remetente
   * @param messageType Tipo de mensagem
   */
  private async createNewMessage(
    senderIdentifier: string,
    ticketId: number,
    message: string,
    senderType: TicketMessageSender,
    senderName: string,
    messageType: TicketMessageType,
    companyId: number,
  ) {
    const ticketMessage = this.ticketMessageRepository.create({
      senderIdentifier,
      message,
      ticketId,
      senderName,
      senderType,
      messageType,
    });
    await this.ticketMessageRepository.save(ticketMessage);

    if (senderType === TicketMessageSender.CUSTOMER) {
      await this.ticketRepository.update(ticketId, {
        lastMessageAt: new Date(),
      });
    }

    this.chatGateway.emitNewMessage(ticketMessage);
    this.eventEmitter.emit('ticket.message.created', {
      ticketId: ticketId,
      companyId: companyId,
      messageContent: message,
      messageType,
      senderType,
      senderName,
      senderIdentifier,
    });
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
      ticket.agent.name,
      TicketMessageType.TEXT,
      ticket.companyId,
    );

    await this.sendMessageToWhatsapp(ticket, messageContent, ticket.agent.name);

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
      score: 5,
    });

    buffer.messages.forEach((messageData) => {
      messagesArray.push({
        role: 'user',
        content: messageData.content,
      });
    });

    const llmThread = await this.llmService.createThreads(messagesArray, {
      companyId: String(buffer.companyId),
    });
    ticket.llmThreadId = llmThread.id;

    await this.ticketRepository.save(ticket);
    this.eventEmitter.emit('ticket.created', {
      ticketId: ticket.id,
      companyId: ticket.companyId,
      customerId: ticket.customerId,
      customerName: buffer.customerName,
      customerPhone: buffer.customerPhone,
      initialMessages: buffer.messages,
    });
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
      status: In([TicketStatus.AI, TicketStatus.IN_PROGRESS]),
    });

    let newTicket = false;
    if (!ticket) {
      ticket = await this.createNewTicket(buffer);
      newTicket = true;
    }

    const ticketMessages: TicketMessage[] = [];
    for (const messageData of buffer.messages) {
      // Se a mensagem original era um áudio, salva a URL do áudio
      if (messageData.audioUrl) {
        // Salva primeiro a mensagem de áudio
        ticketMessages.push(
          await this.createNewMessage(
            buffer.customerPhone,
            ticket.id,
            messageData.audioUrl,
            TicketMessageSender.CUSTOMER,
            buffer.customerName,
            TicketMessageType.AUDIO,
            ticket.companyId,
          ),
        );
      } else {
        ticketMessages.push(
          await this.createNewMessage(
            buffer.customerPhone,
            ticket.id,
            messageData.content,
            TicketMessageSender.CUSTOMER,
            buffer.customerName,
            TicketMessageType.TEXT,
            ticket.companyId,
          ),
        );
      }
    }

    if (newTicket) {
      this.chatGateway.emitNewTicket({
        ...ticket,
        ticketMessages,
        customer: buffer.customer,
      });
    }

    if (ticket.status === TicketStatus.AI) {
      const concatenatedMessages = buffer.messages
        .map((messageData) => messageData.content)
        .join('\n\n');

      await this.llmService.createMessage(ticket.llmThreadId, {
        role: 'user',
        content: concatenatedMessages,
      });

      let llmAgentMessage;
      try {
        llmAgentMessage = await this.llmService.createAndStreamRun(
          ticket.llmThreadId,
          buffer.workflow.workflowAgent?.llmAssistantId || 'gpt-4o-mini',
        );
      } catch (error) {
        console.error('Erro ao processar resposta da OpenAI:', error);
        // Em caso de erro, envia uma mensagem padrão
        await this.createAITicketMessage({
          senderIdentifier: buffer.senderIdentifier,
          content:
            'Desculpe, estou enfrentando dificuldades técnicas no momento. Um agente humano será acionado para te ajudar.',
          ticketId: ticket.id,
        });

        // Transfere para atendimento humano
        await this.ticketRepository.save({
          ...ticket,
          status: TicketStatus.IN_PROGRESS,
          priorityLevel: TicketPriorityLevel.HIGH,
        });

        return;
      }

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

  /**
   * Envia uma mensagem para o WhatsApp
   * @param ticket Ticket
   * @param message Conteúdo da mensagem
   * @param senderName Nome do remetente
   */
  private async sendMessageToWhatsapp(
    ticket: Ticket,
    message: string,
    senderName: string,
  ) {
    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: ticket.customer.phone,
      type: 'text',
      text: {
        body: `*${senderName}*\n\n${message}`,
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
  }

  /**
   * Escolhe a mensagem a ser enviada quando o ticket é alterado
   * @param ticketStatusDto Dados da alteraçã o do ticket
   * @param currentUser Usuário atual
   * @returns Mensagem a ser enviada
   */
  private async chooseMessageToSendWhenTicketIsChanged(
    ticketStatusDto: ChangeTicketStatusDto,
    currentUser: User,
  ) {
    if (ticketStatusDto.status === TicketStatus.CLOSED) {
      return `Obrigado por entrar em contato! Foi um prazer te ajudar até aqui! 😊

Para nos ajudar a melhorar nosso atendimento, você poderia avaliar sua experiência conosco?

👍 5 - Excelente
👌 4 - Bom
😐 3 - Regular
👎 2 - Ruim
👎 1 - Péssimo

Sua opinião é muito importante para nós!`;
    }

    if (ticketStatusDto.status === TicketStatus.IN_PROGRESS) {
      return `A partir deste momento, nosso agente humano ${currentUser.name} assumirá a conversa para te auxiliar com ainda mais atenção. Foi um prazer te ajudar até aqui!`;
    }
  }

  /**
   * Verifica se uma mensagem é uma avaliação (número de 1 a 5)
   * @param message Conteúdo da mensagem
   * @returns Número da avaliação ou null se não for uma avaliação
   */
  private isRatingMessage(message: string): number | null {
    const cleanMessage = message.trim();
    const rating = parseInt(cleanMessage, 10);

    if (rating >= 1 && rating <= 5 && cleanMessage === rating.toString()) {
      return rating;
    }

    return null;
  }

  /**
   * Busca um ticket fechado recentemente sem score
   * @param customerId ID do cliente
   * @param companyId ID da empresa
   * @returns Ticket fechado recente ou null
   */
  private async findRecentClosedTicketWithoutScore(
    customerId: number,
    companyId: number,
  ): Promise<Ticket | null> {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

    return await this.ticketRepository.findOne({
      where: {
        customerId,
        companyId,
        status: TicketStatus.CLOSED,
        score: 0, // Assumindo que tickets sem avaliação têm score 0
        updatedAt: Between(oneHourAgo, new Date()),
      },
      relations: ['customer', 'agent'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Atualiza o score de um ticket
   * @param ticketId ID do ticket
   * @param score Score da avaliação
   */
  private async updateTicketScore(
    ticketId: number,
    score: number,
  ): Promise<void> {
    await this.ticketRepository.update(ticketId, { score });
  }

  /**
   * Envia mensagem de confirmação da avaliação
   * @param ticket Ticket avaliado
   * @param rating Nota da avaliação
   */
  private async sendRatingConfirmationMessage(
    ticket: Ticket,
    rating: number,
  ): Promise<void> {
    const ratingText = {
      1: 'Péssimo',
      2: 'Ruim',
      3: 'Regular',
      4: 'Bom',
      5: 'Excelente',
    };

    const message = `Obrigado pela sua avaliação! Você nos deu nota ${rating} (${ratingText[rating]}).
    
${rating >= 4 ? 'Ficamos felizes que você tenha gostado do nosso atendimento! 🎉' : 'Obrigado pelo feedback! Vamos trabalhar para melhorar ainda mais nosso atendimento. 💪'}

Se precisar de mais alguma coisa, estaremos aqui para ajudar!`;

    await this.sendMessageToWhatsapp(ticket, message, 'Sistema de Avaliação');
  }

  /**
   * Calcula o score de satisfação médio dos tickets
   * @param companyId ID da empresa
   * @param startDate Data de início (opcional)
   * @param endDate Data de fim (opcional)
   * @returns Objeto com estatísticas de satisfação
   */
  async calculateSatisfactionScore(
    companyId: number,
    startDate?: Date,
    endDate?: Date,
    teamId?: string,
  ): Promise<{
    averageScore: number;
    totalRatedTickets: number;
    ratingDistribution: { [key: number]: number };
    satisfactionPercentage: number;
  }> {
    const whereConditions: FindOptionsWhere<Ticket> = {
      companyId,
      status: TicketStatus.CLOSED,
    };

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    }

    if (teamId) {
      whereConditions.areaId = parseInt(teamId);
    }

    const ratedTickets = await this.ticketRepository.find({
      where: whereConditions,
      select: ['score'],
    });

    // Filtrar apenas tickets que foram avaliados (score > 0)
    const actuallyRatedTickets = ratedTickets.filter(
      (ticket) => ticket.score > 0,
    );

    if (actuallyRatedTickets.length === 0) {
      return {
        averageScore: 0,
        totalRatedTickets: 0,
        ratingDistribution: {},
        satisfactionPercentage: 0,
      };
    }

    const totalScore = actuallyRatedTickets.reduce(
      (sum, ticket) => sum + ticket.score,
      0,
    );
    const averageScore = totalScore / actuallyRatedTickets.length;

    // Distribuição das notas
    const ratingDistribution = actuallyRatedTickets.reduce(
      (dist, ticket) => {
        dist[ticket.score] = (dist[ticket.score] || 0) + 1;
        return dist;
      },
      {} as { [key: number]: number },
    );

    // Porcentagem de satisfação (notas 4 e 5)
    const satisfiedCustomers = actuallyRatedTickets.filter(
      (ticket) => ticket.score >= 4,
    ).length;
    const satisfactionPercentage =
      (satisfiedCustomers / actuallyRatedTickets.length) * 100;

    return {
      averageScore: Math.round(averageScore * 100) / 100, // Arredonda para 2 casas decimais
      totalRatedTickets: actuallyRatedTickets.length,
      ratingDistribution,
      satisfactionPercentage: Math.round(satisfactionPercentage * 100) / 100,
    };
  }
}
