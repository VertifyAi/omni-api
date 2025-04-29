import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { TicketsService } from 'src/tickets/tickets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketMessage } from '../tickets/entities/ticket-message.entity';
import { CustomersModule } from 'src/customers/customers.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketMessage]),
    CustomersModule,
    CompaniesModule,
    HttpModule,
  ],
  controllers: [WebhookController],
  providers: [TicketsService],
})
export class WebhookModule {}
