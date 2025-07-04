import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { FreshdeskIntegrationDto } from '../dto/freshdesk-integration.dto';

export interface FreshdeskTicket {
  id?: number;
  subject: string;
  description: string;
  status: number;
  source: number;
  type?: string;
  requester_id?: number;
  responder_id?: number;
  group_id?: number;
  tags?: string[];
  custom_fields?: Record<string, string | number | boolean>;
}

export interface FreshdeskContact {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  twitter_id?: string;
  unique_external_id?: string;
}

@Injectable()
export class FreshdeskService {
  private readonly logger = new Logger(FreshdeskService.name);

  constructor(private readonly httpService: HttpService) {}

  private getAuthHeaders(apiKey: string) {
    const auth = Buffer.from(`${apiKey}:X`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  async createContact(contactData: FreshdeskContact, config: FreshdeskIntegrationDto): Promise<FreshdeskContact> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.domain}/api/v2/contacts`,
          contactData,
          { headers: this.getAuthHeaders(config.api_key) }
        )
      );

      this.logger.log(`Contato criado no Freshdesk: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao criar contato no Freshdesk: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async findContactByPhone(phone: string, config: FreshdeskIntegrationDto): Promise<FreshdeskContact | null> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `${config.domain}/api/v2/contacts?mobile=${phone}`,
          { headers: this.getAuthHeaders(config.api_key) }
        )
      );

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar contato no Freshdesk: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  async createTicket(ticketData: FreshdeskTicket, config: FreshdeskIntegrationDto): Promise<FreshdeskTicket> {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.domain}/api/v2/tickets`,
          ticketData,
          { headers: this.getAuthHeaders(config.api_key) }
        )
      );

      this.logger.log(`Ticket criado no Freshdesk: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao criar ticket no Freshdesk: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async updateTicketStatus(ticketId: number, status: number, config: FreshdeskIntegrationDto): Promise<void> {
    try {
      await lastValueFrom(
        this.httpService.put(
          `${config.domain}/api/v2/tickets/${ticketId}`,
          { status },
          { headers: this.getAuthHeaders(config.api_key) }
        )
      );

      this.logger.log(`Status do ticket ${ticketId} atualizado no Freshdesk para ${status}`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar ticket no Freshdesk: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async addReplyToTicket(freshdeskTicketId: number, message: string, config: FreshdeskIntegrationDto): Promise<void> {
    try {
      await lastValueFrom(
        this.httpService.post(
          `${config.domain}/api/v2/tickets/${freshdeskTicketId}/reply`,
          { body: message },
          { headers: this.getAuthHeaders(config.api_key) }
        )
      );

      this.logger.log(`Resposta adicionada ao ticket ${freshdeskTicketId} no Freshdesk`);
    } catch (error) {
      this.logger.error(`Erro ao adicionar resposta no Freshdesk: ${error.message}`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
} 