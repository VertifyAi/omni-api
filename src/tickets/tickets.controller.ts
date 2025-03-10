import { Controller, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':id/messages')
  getTicketMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.ticketsService.getTicketMessages(id, req.user.companyId);
  }
}
