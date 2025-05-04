import { Controller, Get, UseGuards, Request, Post, Body, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateAITicketMessageDto } from './dto/create-ai-ticket-message.dto';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { SendMessageDto } from './dto/send-message.dto';

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

  @UseGuards(AuthGuard)
  @Get(':ticketId/messages')
  async findMessages(@Param('ticketId') ticketId: number) {
    return await this.ticketsService.findMessagesByTicket(ticketId);
  }

  @UseGuards(AuthGuard)
  @Post(':ticketId/messages')
  async sendMessage(@Param('ticketId') ticketId: number, @Body() sendMessageDto: SendMessageDto) {
    return await this.ticketsService.sendMessage(ticketId, sendMessageDto);
  }


  @UseGuards(AuthGuard)
  @Post('status/:id')
  async changeTicketStatus(@Body() changeTicketStatusDto: ChangeTicketStatusDto, @Request() req, @Param(':id') ticketId: number) {
    return await this.ticketsService.changeTicketStatus(changeTicketStatusDto, req.user, ticketId)
  }
}
