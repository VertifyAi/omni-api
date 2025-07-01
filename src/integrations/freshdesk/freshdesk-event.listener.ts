import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FreshdeskService } from './freshdesk.service';
import {
  TicketCreatedEvent,
  TicketMessageCreatedEvent,
  TicketStatusChangedEvent,
  HumanAssistanceRequestedEvent,
  CustomerCreatedEvent,
} from '../../events/tickets.events';
import { TicketStatus } from 'src/tickets/entities/ticket.entity';
import { IntegrationsService } from '../integrations.service';
import { IntegrationType } from '../entities/integration.entity';
import { FreshdeskIntegrationDto } from '../dto/freshdesk-integration.dto';

@Injectable()
export class FreshdeskEventListener {
  private readonly logger = new Logger(FreshdeskEventListener.name);

  constructor(
    private readonly freshdeskService: FreshdeskService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  private async getFreshdeskConfig(companyId: number): Promise<FreshdeskIntegrationDto | null> {
    try {
      const integrations = await this.integrationsService.findByIds([], companyId);
      const freshdeskIntegration = integrations.find(
        i => i.type === IntegrationType.FRESHDESK && i.active
      );
      
      return freshdeskIntegration ? (freshdeskIntegration.config as FreshdeskIntegrationDto) : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar configuração Freshdesk para empresa ${companyId}: ${error.message}`);
      return null;
    }
  }

  @OnEvent('ticket.created')
  async handleTicketCreated(event: TicketCreatedEvent) {
    this.logger.log(`Processando evento ticket.created para ticket ${event.ticketId}`);

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(`Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`);
      return;
    }

    try {
      // 1. Sincronização de Contatos (se habilitada)
      let freshdeskContact: { id?: number } | null = null;
      if (freshdeskConfig.contact_sync !== false) {
        freshdeskContact = await this.freshdeskService.findContactByPhone(
          event.customerPhone,
          freshdeskConfig
        );

        // 2. Se não existir, criar o contato
        if (!freshdeskContact) {
          freshdeskContact = await this.freshdeskService.createContact({
            name: event.customerName,
            phone: event.customerPhone,
            mobile: event.customerPhone,
            unique_external_id: `omni_customer_${event.customerId}`,
          }, freshdeskConfig);
        }
      }

      // 3. Definir prioridade (se análise de prioridade estiver habilitada)
      let ticketPriority = 1; // Baixa por padrão
      if (freshdeskConfig.priority_analysis) {
        // TODO: Implementar lógica de análise de prioridade baseada no conteúdo
        ticketPriority = this.analyzePriority(event.initialMessages);
      }

      // 4. Criar o ticket no Freshdesk
      const ticketData = {
        subject: `Atendimento WhatsApp - ${event.customerName}`,
        description: this.formatInitialMessages(event.initialMessages),
        status: 2, // Aberto
        priority: ticketPriority,
        source: 7, // Chat (ou o ID correto para WhatsApp na sua configuração)
        tags: ['whatsapp', 'omni-api'],
        custom_fields: {
          omni_ticket_id: event.ticketId,
          omni_company_id: event.companyId,
          customer_phone: event.customerPhone,
        },
        ...(freshdeskContact?.id && { requester_id: freshdeskContact.id }),
      };

      const freshdeskTicket = await this.freshdeskService.createTicket(ticketData, freshdeskConfig);

      this.logger.log(
        `Ticket criado no Freshdesk: ${freshdeskTicket.id} para ticket interno ${event.ticketId}`
      );

      // TODO: Se necessário, salvar o freshdeskTicketId como campo na entidade Ticket
      // para facilitar operações futuras (atualização de status, mensagens, etc.)

    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.created para ticket ${event.ticketId}: ${error.message}`
      );
    }
  }

  @OnEvent('ticket.message.created')
  async handleTicketMessageCreated(event: TicketMessageCreatedEvent) {
    this.logger.log(`Processando evento ticket.message.created para ticket ${event.ticketId}`);

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(`Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`);
      return;
    }

    try {
      if (!event.freshdeskTicketId) {
        this.logger.warn(`Ticket ${event.ticketId} não possui freshdeskTicketId`);
        return;
      }

      // Verificar se deve processar mensagens com IA (se habilitado)
      if (event.senderType === 'AI' && !freshdeskConfig.ai_integration) {
        this.logger.debug(`Integração com IA desabilitada para empresa ${event.companyId}. Ignorando mensagem da IA.`);
        return;
      }

      // Adicionar mensagem como nota ou resposta no Freshdesk
      if (event.senderType === 'CUSTOMER') {
        // Mensagem do cliente - adicionar como resposta
        await this.freshdeskService.addReplyToTicket(
          event.freshdeskTicketId,
          `${event.senderName}: ${event.messageContent}`,
          freshdeskConfig
        );
      } else {
        // Mensagem do agente/IA - adicionar como nota interna
        await this.freshdeskService.addNoteToTicket(
          event.freshdeskTicketId,
          `[${event.senderType}] ${event.senderName}: ${event.messageContent}`,
          freshdeskConfig
        );
      }

      this.logger.log(
        `Mensagem adicionada ao ticket ${event.freshdeskTicketId} no Freshdesk`
      );

    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.message.created para ticket ${event.ticketId}: ${error.message}`
      );
    }
  }

  @OnEvent('ticket.status.changed')
  async handleTicketStatusChanged(event: TicketStatusChangedEvent) {
    this.logger.log(`Processando evento ticket.status.changed para ticket ${event.ticketId}`);

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(`Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`);
      return;
    }

    try {
      if (!event.freshdeskTicketId) {
        this.logger.warn(`Ticket ${event.ticketId} não possui freshdeskTicketId`);
        return;
      }

      // Verificar se transferência de tickets está habilitada
      if (!freshdeskConfig.ticket_transfer) {
        this.logger.debug(`Transferência de tickets desabilitada para empresa ${event.companyId}. Ignorando mudança de status.`);
        return;
      }

      // Mapear status interno para status do Freshdesk
      const freshdeskStatus = this.mapTicketStatusToFreshdesk(event.newStatus);

      await this.freshdeskService.updateTicketStatus(
        event.freshdeskTicketId,
        freshdeskStatus,
        freshdeskConfig
      );

      // Adicionar nota sobre a mudança de status
      await this.freshdeskService.addNoteToTicket(
        event.freshdeskTicketId,
        `Status alterado por ${event.changedByUserName} de ${event.oldStatus} para ${event.newStatus}. ${event.messageSentToCustomer}`,
        freshdeskConfig
      );

      this.logger.log(
        `Status do ticket ${event.freshdeskTicketId} atualizado no Freshdesk`
      );

    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.status.changed para ticket ${event.ticketId}: ${error.message}`
      );
    }
  }

  @OnEvent('human.assistance.requested')
  async handleHumanAssistanceRequested(event: HumanAssistanceRequestedEvent) {
    this.logger.log(`Processando evento human.assistance.requested para ticket ${event.ticketId}`);

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(`Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`);
      return;
    }

    try {
      await this.freshdeskService.updateTicketStatus(
        event.freshdeskTicketId,
        2, // Aberto
        freshdeskConfig
      );

      // Adicionar nota urgente
      await this.freshdeskService.addNoteToTicket(
        event.freshdeskTicketId,
        `🚨 ASSISTÊNCIA HUMANA SOLICITADA 🚨\n` +
        `Prioridade: ${event.priorityLevel}\n` +
        `Equipe: ${event.targetTeamName}\n` +
        `Solicitado por: ${event.agentName}\n` +
        `Este ticket requer atenção imediata de um agente humano.`,
        freshdeskConfig
      );

      this.logger.log(
        `Solicitação de assistência humana processada para ticket ${event.freshdeskTicketId}`
      );

    } catch (error) {
      this.logger.error(
        `Erro ao processar human.assistance.requested para ticket ${event.ticketId}: ${error.message}`
      );
    }
  }

  @OnEvent('customer.created')
  async handleCustomerCreated(event: CustomerCreatedEvent) {
    this.logger.log(`Processando evento customer.created para cliente ${event.customerId}`);
  }

  private formatInitialMessages(messages: { content: string; type: string }[]): string {
    return messages
      .map(msg => `[${msg.type}] ${msg.content}`)
      .join('\n\n');
  }

  private mapTicketStatusToFreshdesk(status: TicketStatus): number {
    const statusMap = {
      [TicketStatus.AI]: 2,            // Aberto
      [TicketStatus.IN_PROGRESS]: 3,   // Pendente  
      [TicketStatus.CLOSED]: 5,       // Fechado
    };

    return statusMap[status] || 2; // Default para Aberto
  }

  private mapPriorityToFreshdesk(priority: string): number {
    const priorityMap = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'URGENT': 4,
    };

    return priorityMap[priority] || 2; // Default para Medium
  }

  private analyzePriority(messages: { content: string; type: string }[]): number {
    // Análise básica de prioridade baseada em palavras-chave
    const urgentKeywords = ['urgente', 'emergência', 'crítico', 'importante', 'rápido'];
    const highKeywords = ['problema', 'erro', 'falha', 'não funciona'];
    
    const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (urgentKeywords.some(keyword => allContent.includes(keyword))) {
      return 4; // Urgente
    }
    
    if (highKeywords.some(keyword => allContent.includes(keyword))) {
      return 3; // Alta
    }
    
    return 1; // Baixa (padrão)
  }

  private shouldSendAutomaticResponse(config: FreshdeskIntegrationDto): boolean {
    // Verificar se respostas automáticas estão habilitadas
    if (!config.auto_responses) {
      return false;
    }

    // Verificar horário de funcionamento se habilitado
    if (config.business_hours_check) {
      return this.isWithinBusinessHours();
    }

    return true;
  }

  private isWithinBusinessHours(): boolean {
    // Lógica básica - pode ser expandida com configurações específicas
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    
    // Horário comercial: segunda a sexta, 8h às 18h
    return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
  }
} 