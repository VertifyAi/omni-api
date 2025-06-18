import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowsChannels } from './entities/workflows-channels.entity';
import { UsersModule } from 'src/users/users.module';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { AgentsModule } from 'src/agents/agents.module';
import { TeamsModule } from 'src/teams/teams.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowsChannels]),
    UsersModule,
    AgentsModule,
    TeamsModule,
    IntegrationsModule,
    JwtModule
  ],
  providers: [WorkflowsService],
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
