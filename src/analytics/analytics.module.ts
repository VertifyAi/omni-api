import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TicketsModule } from 'src/tickets/tickets.module';
import { JwtModule } from '@nestjs/jwt';
import { TeamsModule } from 'src/teams/teams.module';

@Module({
  imports: [TicketsModule, TeamsModule, JwtModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
