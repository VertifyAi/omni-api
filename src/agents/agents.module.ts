import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { Agent } from './entities/agent.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { TeamsModule } from 'src/teams/teams.module';
import { InteractionExample } from './entities/interaction-example.entity';
import { TeamsToRedirect } from './entities/teams-to-redirect.entity';
import { AgentsllmKnowledgeBase } from './entities/agents-llm-knowledge-base.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      InteractionExample,
      TeamsToRedirect,
      AgentsllmKnowledgeBase,
    ]),
    JwtModule,
    ConfigModule,
    IntegrationsModule,
    TeamsModule,
  ],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
