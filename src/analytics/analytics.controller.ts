import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { User } from 'src/users/entities/user.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { Response } from 'express';

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

  @UseGuards(AuthGuard)
  @Get('export-pdf')
  async exportPdf(
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.analyticsService.exportPdf(
      req.user as User,
      getAnalyticsDto,
    );

    // Configurar headers para download do PDF
    const filename = `relatorio-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
