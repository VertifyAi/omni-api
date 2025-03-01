import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketMessagesController } from './ticket_messages.controller';
import { TicketMessagesService } from './ticket_messages.service';
import { TicketsModule } from 'src/tickets/tickets.module';
import { PhonesModule } from 'src/phones/phones.module';
import { TicketMessage } from './entities/ticket-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketMessage]),
    forwardRef(() => TicketsModule),
    forwardRef(() => PhonesModule),
  ],
  controllers: [TicketMessagesController],
  providers: [TicketMessagesService],
  exports: [TicketMessagesService],
})
export class TicketMessagesModule {}
