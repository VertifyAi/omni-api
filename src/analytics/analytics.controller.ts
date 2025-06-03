import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { User } from 'src/users/entities/user.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getAnalytics(
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req,
  ) {
    return this.analyticsService.getAnalytics(
      getAnalyticsDto,
      req.user as User,
    );
  }
}
