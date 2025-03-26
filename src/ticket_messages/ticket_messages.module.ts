import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketMessagesService } from './ticket_messages.service';
import { TicketMessagesController } from './ticket_messages.controller';
import { TicketMessage } from './entities/ticket_message.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { TwilioModule } from '../twilio/twilio.module';
import { PhonesModule } from '../phones/phones.module';
import { TicketMessagesGateway } from './ticket_messages.gateway';
import { VeraAIService } from './vera-ai.service';
import { Integration } from '../integrations/entities/integration.entity';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketMessage, Integration]),
    forwardRef(() => TicketsModule),
    TwilioModule,
    PhonesModule,
    IntegrationsModule,
  ],
  controllers: [TicketMessagesController],
  providers: [
    TicketMessagesService,
    TicketMessagesGateway,
    VeraAIService,
  ],
  exports: [TicketMessagesService],
})
export class TicketMessagesModule {}
