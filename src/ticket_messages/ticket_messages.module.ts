import { Module } from '@nestjs/common';
import { TicketMessagesController } from './ticket_messages.controller';
import { TicketMessagesService } from './ticket_messages.service';

@Module({
  controllers: [TicketMessagesController],
  providers: [TicketMessagesService]
})
export class TicketMessagesModule {}
