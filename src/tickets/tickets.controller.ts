import { Controller, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TicketMessage } from '../ticket_messages/entities/ticket_message.entity';
import { Ticket } from './entities/ticket.entity';

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({ summary: 'Listar todos os tickets da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de tickets obtida com sucesso', type: [Ticket] })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @Get()
  findAll(@Request() req) {
    return this.ticketsService.findAll(req.user.companyId);
  }

  @ApiOperation({ summary: 'Obter mensagens de um ticket' })
  @ApiResponse({ status: 200, description: 'Mensagens obtidas com sucesso', type: [TicketMessage] })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do ticket' })
  @Get(':id/messages')
  getTicketMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.ticketsService.getTicketMessages(id, req.user.companyId);
  }
}
