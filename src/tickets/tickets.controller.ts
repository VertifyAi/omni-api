import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateAITicketMessageDto } from './dto/create-ai-ticket-message.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Request() req) {
    return await this.ticketsService.findAllTickets(req.user.companyId);
  }

  @Post()
  async createAITicketMessage(@Body() createAITicketMessageDto: CreateAITicketMessageDto) {
    return await this.ticketsService.createAITicketMessage(createAITicketMessageDto)
  }
}
