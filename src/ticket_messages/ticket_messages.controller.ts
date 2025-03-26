import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { TicketMessagesService } from './ticket_messages.service';
import { User } from '../auth/interfaces/user.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TicketMessage } from './entities/ticket_message.entity';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Mensagens de Tickets')
@Controller('ticket-messages')
@UseGuards(AuthGuard)
export class TicketMessagesController {
  constructor(private readonly ticketMessagesService: TicketMessagesService) {}

  @ApiOperation({ summary: 'Processar mensagem recebida via webhook' })
  @ApiResponse({ status: 200, description: 'Mensagem processada com sucesso', type: TicketMessage })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post('webhook')
  async handleWebhook(@Body() webhookData: TwilioWebhookDto) {
    return this.ticketMessagesService.create(webhookData);
  }

  @ApiOperation({ summary: 'Enviar mensagem para um ticket' })
  @ApiResponse({ status: 200, description: 'Mensagem enviada com sucesso', type: TicketMessage })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  @Post('tickets/:ticketId/messages')
  async sendMessage(
    @Param('ticketId') ticketId: number,
    @Body() data: { content: string },
    @Req() req: { user: User },
  ) {
    return this.ticketMessagesService.sendMessage(ticketId, data.content);
  }

  @Get('tickets/:ticketId/messages')
  async findAll(
    @Param('ticketId') ticketId: number,
    @Req() req: { user: User },
  ) {
    return this.ticketMessagesService.findAll(ticketId);
  }
}
