import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreshdeskService } from './freshdesk.service';
import { FreshdeskEventListener } from './freshdesk-event.listener';
import { IntegrationsService } from '../integrations.service';
import { Integration } from '../entities/integration.entity';
import { TicketsService } from '../../tickets/tickets.service';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { TicketMessage } from '../../tickets/entities/ticket-message.entity';
import { CustomersService } from '../../customers/customers.service';
import { Customer } from '../../customers/entities/customer.entity';
import { CompaniesService } from '../../companies/companies.service';
import { Company } from '../../companies/entities/company.entity';
import { AgentsService } from '../../agents/agents.service';
import { Agent } from '../../agents/entities/agent.entity';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { ChatGateway } from '../../gateway/chat.gateway';
import { VeraiService } from '../../verai/verai.service';
import { TeamsService } from '../../teams/teams.service';
import { Team } from '../../teams/entities/teams.entity';
import { OpenAIService } from '../openai/openai.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { Workflow } from '../../workflows/entities/workflow.entity';
import { WorkflowsChannels } from '../../workflows/entities/workflows-channels.entity';
import { S3Service } from '../aws/s3.service';
import { PageService } from '../../utils/services/page.service';
import { InteractionExample } from '../../agents/entities/interaction-example.entity';
import { TeamsToRedirect } from '../../agents/entities/teams-to-redirect.entity';
import { UsersAreas } from '../../teams/entities/users_areas.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Integration,
      Ticket,
      TicketMessage,
      Customer,
      Company,
      Agent,
      User,
      Team,
      Workflow,
      WorkflowsChannels,
      InteractionExample,
      TeamsToRedirect,
      UsersAreas,
    ]),
  ],
  providers: [
    FreshdeskService,
    FreshdeskEventListener,
    IntegrationsService,
    TicketsService,
    CustomersService,
    CompaniesService,
    AgentsService,
    UsersService,
    ChatGateway,
    VeraiService,
    TeamsService,
    OpenAIService,
    WorkflowsService,
    S3Service,
    PageService,
  ],
  exports: [
    FreshdeskService,
  ],
})
export class FreshdeskModule {} 