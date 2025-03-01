import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketMessagesService } from 'src/ticket_messages/ticket_messages.service';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { PhonesService } from 'src/phones/phones.service';
import { SenderEnum } from 'src/ticket_messages/entities/ticket-message.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly phoneService: PhonesService,
    @Inject(forwardRef(() => TicketMessagesService))
    private readonly ticketMessagesService: TicketMessagesService,
  ) {}

  async findOpenTicketByPhone(phoneNumber: string): Promise<Ticket | null> {
    const phone = await this.phoneService.findOneByPhone(phoneNumber);
    return this.ticketRepository.findOne({
      where: { customerPhoneId: phone?.id, status: TicketStatus.OPEN },
    });
  }

  async createTicket(
    phoneNumber: string,
    initialMessage: string,
  ): Promise<Ticket> {
    let phone = await this.phoneService.findOneByPhone(phoneNumber);

    if (!phone) {
      phone = await this.phoneService.create(phoneNumber);
    }

    const newTicket = this.ticketRepository.create({
      customerPhoneId: phone.id,
      status: TicketStatus.OPEN,
      subject: initialMessage,
      areaId: 1, //identificar a área correta
      companyId: 1, //identificar a empresa correta
    });
    const ticket = await this.ticketRepository.save(newTicket);
    await this.ticketMessagesService.createMessage(
      phone.id,
      SenderEnum.CUSTOMER,
      initialMessage,
    );
    return ticket;
  }
}
