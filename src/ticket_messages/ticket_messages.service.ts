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
    let ticket = await this.ticketsService.findOpenTicketByPhone(
      body.From.split(':')[1],
    );

    if (!ticket) {
      ticket = await this.ticketsService.createTicket(
        body.From.split(':')[1],
        body.Body,
      );
    } else {
      const phone = await this.phonesService.findOneByPhone(
        body.From.split(':')[1],
      );

      if (!phone) {
        throw new Error('Phone not found');
      }

      await this.createMessage(phone.id, SenderEnum.CUSTOMER, body.Body);

      this.ticketMessagesGateway.notifyNewMessage({
        ticketId: ticket.id,
        message: body.Body,
        sender: SenderEnum.CUSTOMER,
        createdAt: new Date()
      });
    }

    // const responseMessage = `Recebemos sua mensagem. Seu ticket está em análise.`;
    // await this.sendMessage(from, responseMessage);
    // return responseMessage;
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

      const message = await this.createMessage(
        phone.id,
        SenderEnum.AGENT,
        body.Body,
      );

      if (!message) {
        throw new Error('Message not created');
      }

      const result = await this.twilioClient.messages.create({
        to: `whatsapp:${body.From}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER as string}`,
        body: body.Body,
      });

      console.log('Message sent:', result);
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Error while trying to send message');
    }
  }

  async createMessage(
    phoneNumberId: number,
    sender: SenderEnum,
    message: string,
  ) {
    try {
      const ticketMessage = this.ticketMessageRepository.create({
        costumerPhoneId: phoneNumberId,
        ticketId: 1, //identificar o ticket correto
        sender:
          sender === SenderEnum.CUSTOMER
            ? SenderEnum.CUSTOMER
            : SenderEnum.AGENT,
        message,
      });

      return await this.ticketMessageRepository.save(ticketMessage);
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Error while trying to create message');
    }
  }
}
