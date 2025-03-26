import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessage, SenderEnum } from './entities/ticket_message.entity';
import { TicketsService } from '../tickets/tickets.service';
import { TwilioService } from '../twilio/twilio.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { TicketMessagesGateway } from './ticket_messages.gateway';
import { VeraAIService } from './vera-ai.service';
import { HandleWebhookDto } from './dto/handle-webhook.dto';
import { PhonesService } from '../phones/phones.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class TicketMessagesService {
  constructor(
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly integrationsService: IntegrationsService,
    private readonly twilioService: TwilioService,
    private readonly ticketMessagesGateway: TicketMessagesGateway,
    private readonly veraAIService: VeraAIService,
    private readonly phonesService: PhonesService,
  ) {}

  async processIncomingMessage(body: HandleWebhookDto) {
    const phoneNumber = body.From.split(':')[1];
    let ticket = await this.ticketsService.findOpenTicketByPhone(phoneNumber);

    if (!ticket) {
      // Cria um novo ticket e adiciona a primeira mensagem
      ticket = await this.ticketsService.createTicket(phoneNumber, body.Body);

      // Cria a mensagem inicial
      const message = await this.create({
        Body: body.Body,
        From: body.From,
        To: body.To,
        MessageSid: body.MessageSid,
      });

      // Se é uma nova conversa, a Vera AI deve responder
      const aiResponse = await this.veraAIService.generateResponse(body.Body);
      await this.sendMessage(ticket.id, aiResponse);

      // Notifica sobre a nova mensagem
      this.ticketMessagesGateway.notifyNewMessage({
        ticketId: ticket.id,
        message: body.Body,
        sender: SenderEnum.CUSTOMER,
        createdAt: new Date()
      });

      // Inicia o processo de triagem
      const messages = [body.Body];
      const triageResult = await this.veraAIService.performTriage(messages);

      // Atualiza o ticket com o resultado da triagem
      await this.ticketsService.updateTicketTriage(ticket.id, triageResult);

      return message;
    } else {
      // Se o ticket já existe, apenas adiciona a nova mensagem
      const message = await this.create({
        Body: body.Body,
        From: body.From,
        To: body.To,
        MessageSid: body.MessageSid,
      });

      // Se o ticket ainda não foi triado, continua o processo de triagem
      if (!ticket.triaged) {
        const messages = await this.ticketsService.findMessages(ticket.id);
        const messageContents = messages.map(m => m.content);
        const triageResult = await this.veraAIService.performTriage(messageContents);
        await this.ticketsService.updateTicketTriage(ticket.id, triageResult);
      }

      this.ticketMessagesGateway.notifyNewMessage({
        ticketId: ticket.id,
        message: body.Body,
        sender: SenderEnum.CUSTOMER,
        createdAt: new Date()
      });

      return message;
    }
  }

  async create(webhookData: TwilioWebhookDto) {
    // const integrations = await this.integrationsService.findByCompanyId(1); // TODO: Pegar company_id do usuário
    // const integration = integrations.find(i => i.config?.phoneNumber === webhookData.To);

    // if (!integration) {
    //   throw new NotFoundException('Integração WhatsApp não encontrada');
    // }

    const customerPhone = webhookData.From.replace('whatsapp:', '');
    // let phone = await this.phonesService.findOneByPhone(customerPhone);
    
    // if (!phone) {
    //   phone = await this.phonesService.create(customerPhone, integration.company_id);
    // }

    // let ticket = await this.ticketsService.findByPhone(phone);
    // if (!ticket) {
    //   ticket = await this.ticketsService.create(phone, 'Novo contato via WhatsApp');
    // }

    const message = await this.ticketMessageRepository.save({
      // ticket_id: ticket.id,
      content: webhookData.Body,
      sender: SenderEnum.CUSTOMER,
      whatsapp_number: customerPhone,
      whatsapp_message_id: webhookData.MessageSid,
    });

    return message;
  }

  async sendMessage(ticketId: number, content: string) {
    const ticket = await this.ticketsService.findOne(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // const integration = await this.integrationsService.findWhatsAppIntegration(ticket.company_id);
    // if (!integration) {
    //   throw new NotFoundException('Integração WhatsApp não encontrada');
    // }

    const phone = await this.phonesService.findOneByPhone(ticket.customer_phone_id.toString());
    if (!phone) {
      throw new NotFoundException('Telefone do cliente não encontrado');
    }

    // const twilioMessage = await this.twilioService.sendMessage(
    //   phone.number,
    //   content,
    //   integration.config?.twilioNumberSid,
    //   integration.config?.phoneNumber,
    // );

    const message = await this.ticketMessageRepository.save({
      ticket_id: ticket.id,
      content,
      sender: SenderEnum.AGENT,
      // whatsapp_number: integration.config?.phoneNumber,
      // whatsapp_message_id: twilioMessage.sid,
    });

    // Notifica sobre a nova mensagem
    this.ticketMessagesGateway.notifyNewMessage({
      ticketId,
      message: content,
      sender: SenderEnum.AGENT,
      createdAt: new Date()
    });

    return message;
  }

  async findAll(ticketId: number) {
    return this.ticketMessageRepository.find({
      where: { ticket_id: ticketId },
      order: { created_at: 'ASC' },
    });
  }
}
