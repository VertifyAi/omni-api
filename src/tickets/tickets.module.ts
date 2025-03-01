import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { Phone } from 'src/phones/entities/phone.entity';
import { PhonesModule } from 'src/phones/phones.module';
import { TicketMessagesModule } from 'src/ticket_messages/ticket_messages.module';
import { TicketMessage } from 'src/ticket_messages/entities/ticket-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Phone, TicketMessage]),
    PhonesModule,
    TicketMessagesModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
