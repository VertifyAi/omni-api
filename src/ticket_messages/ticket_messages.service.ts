import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TicketsService } from 'src/tickets/tickets.service';
import { HandleWebhookDto } from './dto/handle-webhook.dto';
import { Repository } from 'typeorm';
import { Twilio } from 'twilio';
import { InjectRepository } from '@nestjs/typeorm';
import { SenderEnum, TicketMessage } from './entities/ticket_message.entity';
import { PhonesService } from 'src/phones/phones.service';
import { SendMessageDto } from './dto/send-message.dto';
import { TicketMessagesGateway } from './ticket_messages.gateway';

@Injectable()
export class TicketMessagesService {
  private twilioClient: Twilio;

  constructor(
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly phonesService: PhonesService,
    private readonly ticketMessagesGateway: TicketMessagesGateway,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async processIncomingMessage(body: HandleWebhookDto) {
    const phoneNumber = body.From.split(':')[1];
    let ticket = await this.ticketsService.findOpenTicketByPhone(phoneNumber);

    if (!ticket) {
      // Cria um novo ticket e adiciona a primeira mensagem
      ticket = await this.ticketsService.createTicket(phoneNumber, body.Body);
      
      // Busca o telefone (que já foi criado junto com o ticket se não existia)
      const phone = await this.phonesService.findOneByPhone(phoneNumber);
      
      if (!phone) {
        throw new Error('Phone not found after ticket creation');
      }

      // Cria a mensagem inicial
      const message = await this.createMessage(ticket.id, SenderEnum.CUSTOMER, body.Body);

      // Notifica sobre a nova mensagem
      this.ticketMessagesGateway.notifyNewMessage({
        ticketId: ticket.id,
        message: body.Body,
        sender: SenderEnum.CUSTOMER,
        createdAt: new Date()
      });

      return message;
    } else {
      // Se o ticket já existe, apenas adiciona a nova mensagem
      const message = await this.createMessage(ticket.id, SenderEnum.CUSTOMER, body.Body);

      this.ticketMessagesGateway.notifyNewMessage({
        ticketId: ticket.id,
        message: body.Body,
        sender: SenderEnum.CUSTOMER,
        createdAt: new Date()
      });

      return message;
    }
  }

  async sendMessage(body: SendMessageDto) {
    try {
      const ticket = await this.ticketsService.findOpenTicketByPhone(body.From);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const phone = await this.phonesService.findOneByPhone(body.From);

      if (!phone) {
        throw new Error('Phone not found');
      }

      const message = await this.createMessage(ticket.id, SenderEnum.AGENT, body.Body);

      if (!message) {
        throw new Error('Message not created');
      }

      const result = await this.twilioClient.messages.create({
        to: `whatsapp:${body.From}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER as string}`,
        body: body.Body,
      });

      console.log('Message sent:', result);
      return message;
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Error while trying to send message');
    }
  }

  async createMessage(
    ticketId: number,
    sender: SenderEnum,
    message: string,
  ) {
    try {
      const ticketMessage = this.ticketMessageRepository.create({
        ticket_id: ticketId,
        sender,
        message: message,
      });

      return await this.ticketMessageRepository.save(ticketMessage);
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Error while trying to create message');
    }
  }

  async create(phoneNumberId: number, content: string): Promise<TicketMessage> {
    const message = this.ticketMessageRepository.create({
      ticket_id: 1, //identificar o ticket correto
      sender: SenderEnum.CUSTOMER,
      message: content
    });
    return this.ticketMessageRepository.save(message);
  }
}
