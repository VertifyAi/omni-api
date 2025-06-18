import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { TicketsService } from 'src/tickets/tickets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketMessage } from '../tickets/entities/ticket-message.entity';
import { CustomersModule } from 'src/customers/customers.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { HttpModule } from '@nestjs/axios';
import { AgentsModule } from 'src/agents/agents.module';
import { ChatGateway } from 'src/gateway/chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { VeraiModule } from 'src/verai/verai.module';
import { TeamsModule } from 'src/teams/teams.module';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { BillingModule } from 'src/billing/billing.module';
import { WorkflowsModule } from 'src/workflows/workflows.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketMessage, User]),
    CustomersModule,
    CompaniesModule,
    HttpModule,
    AgentsModule,
    JwtModule,
    UsersModule,
    VeraiModule,
    TeamsModule,
    IntegrationsModule,
    BillingModule,
    WorkflowsModule,
  ],
  controllers: [WebhookController],
  providers: [TicketsService, ChatGateway],
})
export class WebhookModule {}
