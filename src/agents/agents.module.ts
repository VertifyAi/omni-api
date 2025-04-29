import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { Agent } from './entities/agent.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Agent]), JwtModule, ConfigModule],
  providers: [AgentsService],
  controllers: [AgentsController]
})
export class AgentsModule {}
