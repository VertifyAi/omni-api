import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FreshdeskService } from './freshdesk.service';
import {
  TicketCreatedEvent,
  TicketMessageCreatedEvent,
  TicketStatusChangedEvent,
  CustomerCreatedEvent,
} from '../../events/tickets.events';
import { TicketStatus } from 'src/tickets/entities/ticket.entity';
import { IntegrationsService } from '../integrations.service';
import { IntegrationType } from '../entities/integration.entity';
import { FreshdeskIntegrationDto } from '../dto/freshdesk-integration.dto';
import { TicketsService } from 'src/tickets/tickets.service';

@Injectable()
export class FreshdeskEventListener {
  private readonly logger = new Logger(FreshdeskEventListener.name);

  constructor(
    private readonly freshdeskService: FreshdeskService,
    private readonly integrationsService: IntegrationsService,
    private readonly ticketsService: TicketsService,
  ) {}

  private async getFreshdeskConfig(
    companyId: number,
  ): Promise<FreshdeskIntegrationDto | null> {
    try {
      const freshdeskIntegration =
        await this.integrationsService.findActiveIntegrationByCompanyIdAndType(
          companyId,
          IntegrationType.FRESHDESK,
        );

      return freshdeskIntegration
        ? (freshdeskIntegration.config as FreshdeskIntegrationDto)
        : null;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar configuração Freshdesk para empresa ${companyId}: ${error.message}`,
      );
      return null;
    }
  }

  @OnEvent('ticket.created')
  async handleTicketCreated(event: TicketCreatedEvent) {
    this.logger.log(
      `Processando evento ticket.created para ticket ${event.ticketId}`,
    );

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(
        `Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    // Verificar se a criação de ticket está habilitada
    if (!freshdeskConfig.ticket_creation) {
      this.logger.debug(
        `Criação de ticket não sincronizada para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    try {
      // 1. Sincronização de Contatos (se habilitada)
      let freshdeskContact: { id?: number } | null = null;
      if (freshdeskConfig.contact_sync) {
        freshdeskContact = await this.freshdeskService.findContactByPhone(
          event.customerPhone,
          freshdeskConfig,
        );

        // 2. Se não existir, criar o contato
        if (!freshdeskContact) {
          freshdeskContact = await this.freshdeskService.createContact(
            {
              name: event.customerName,
              mobile: event.customerPhone,
              unique_external_id: `omni_customer_${event.customerId}`,
            },
            freshdeskConfig,
          );
        }
      }

      // 3. Criar o ticket no Freshdesk
      const ticketData = {
        subject: `Atendimento WhatsApp - ${event.customerName}`,
        description: this.formatInitialMessages(event.initialMessages),
        status: 2, // Aberto
        source: 3, // Phone
        priority: 2, // Média
        tags: ['whatsapp', 'omnify'],
        custom_fields: {
          omnify_ticket_id: event.ticketId,
          omnify_company_id: event.companyId,
          customer_phone: event.customerPhone,
        },
        ...(freshdeskContact?.id && { requester_id: freshdeskContact.id }),
      };

      const freshdeskTicket = await this.freshdeskService.createTicket(
        ticketData,
        freshdeskConfig,
      );

      this.logger.log(
        `Ticket criado no Freshdesk: ${freshdeskTicket.id} para ticket interno ${event.ticketId}`,
      );

      // 4. Atualizar o ticket interno com o ID do Freshdesk
      if (freshdeskTicket.id) {
        await this.ticketsService.updateTicket(event.ticketId, {
          freshdeskTicketId: freshdeskTicket.id,
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.created para ticket ${event.ticketId}: ${error.message}`,
      );
    }
  }

  @OnEvent('ticket.message.created')
  async handleTicketMessageCreated(event: TicketMessageCreatedEvent) {
    this.logger.log(
      `Processando evento ticket.message.created para ticket ${event.ticketId}`,
    );

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(
        `Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    try {
      if (!event.freshdeskTicketId) {
        this.logger.warn(
          `Ticket ${event.ticketId} não possui freshdeskTicketId`,
        );
        return;
      }

      // Formatar mensagem com informações do remetente
      const messageBody = `**${event.senderName}** (${event.senderType}):\n\n${event.messageContent}`;

      await this.freshdeskService.addReplyToTicket(
        event.freshdeskTicketId,
        messageBody,
        freshdeskConfig,
      );

      this.logger.log(
        `Mensagem adicionada ao ticket ${event.freshdeskTicketId} no Freshdesk`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.message.created para ticket ${event.ticketId}: ${error.message}`,
      );
    }
  }

  @OnEvent('ticket.status.changed')
  async handleTicketStatusChanged(event: TicketStatusChangedEvent) {
    this.logger.log(
      `Processando evento ticket.status.changed para ticket ${event.ticketId}`,
    );

    // Buscar configuração Freshdesk da empresa
    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(
        `Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    try {
      if (!event.freshdeskTicketId) {
        this.logger.warn(
          `Ticket ${event.ticketId} não possui freshdeskTicketId`,
        );
        return;
      }

      // Verificar se a sincronização de fechamento está habilitada
      if (event.newStatus === TicketStatus.CLOSED) {
        if (!freshdeskConfig.ticket_close) {
          this.logger.debug(
            `Fechamento de ticket não sincronizado para empresa ${event.companyId}. Ignorando evento.`,
          );
          return;
        }
      }

      // Mapear status interno para status do Freshdesk
      const freshdeskStatus = this.mapTicketStatusToFreshdesk(event.newStatus);

      await this.freshdeskService.updateTicketStatus(
        event.freshdeskTicketId,
        freshdeskStatus,
        freshdeskConfig,
      );

      this.logger.log(
        `Status do ticket ${event.freshdeskTicketId} atualizado no Freshdesk para status ${freshdeskStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket.status.changed para ticket ${event.ticketId}: ${error.message}`,
      );
    }
  }

  @OnEvent('customer.created')
  async handleCustomerCreated(event: CustomerCreatedEvent) {
    this.logger.log(
      `Processando evento customer.created para cliente ${event.customerId}`,
    );

    const freshdeskConfig = await this.getFreshdeskConfig(event.companyId);
    if (!freshdeskConfig) {
      this.logger.debug(
        `Integração Freshdesk não ativa para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    // Verificar se a sincronização de contatos está habilitada
    if (!freshdeskConfig.contact_sync) {
      this.logger.debug(
        `Sincronização de contatos não habilitada para empresa ${event.companyId}. Ignorando evento.`,
      );
      return;
    }

    try {
      const freshdeskContact = await this.freshdeskService.findContactByPhone(
        event.customerPhone,
        freshdeskConfig,
      );

      if (!freshdeskContact) {
        const newContact = await this.freshdeskService.createContact(
          {
            name: event.customerName,
            mobile: event.customerPhone,
            unique_external_id: `omni_customer_${event.customerId}`,
          },
          freshdeskConfig,
        );

        this.logger.log(
          `Contato criado no Freshdesk: ${newContact.id} para cliente ${event.customerId}`,
        );
      } else {
        this.logger.log(
          `Contato ${freshdeskContact.id} já existe no Freshdesk para cliente ${event.customerId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar customer.created para cliente ${event.customerId}: ${error.message}`,
      );
    }
  }

  private formatInitialMessages(
    messages: { content: string; type: string }[],
  ): string {
    return messages.map((msg) => `[${msg.type}] ${msg.content}`).join('\n\n');
  }

  private mapTicketStatusToFreshdesk(status: TicketStatus): number {
    const statusMap = {
      [TicketStatus.AI]: 2, // Aberto
      [TicketStatus.IN_PROGRESS]: 3, // Pendente
      [TicketStatus.CLOSED]: 5, // Fechado
    };

    return statusMap[status] || 2; // Default para Aberto
  }
}
