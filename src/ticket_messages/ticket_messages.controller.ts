import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TicketMessagesService } from './ticket_messages.service';
import { HandleWebhookDto } from './dto/handle-webhook.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TicketMessage } from './entities/ticket_message.entity';

@ApiTags('Mensagens de Tickets')
@Controller('ticket-messages')
export class TicketMessagesController {
  constructor(private readonly ticketMessagesService: TicketMessagesService) {}

  @ApiOperation({ summary: 'Processar mensagem recebida via webhook' })
  @ApiResponse({ status: 200, description: 'Mensagem processada com sucesso', type: TicketMessage })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: HandleWebhookDto) {
    return this.ticketMessagesService.processIncomingMessage(body);
  }

  @ApiOperation({ summary: 'Enviar mensagem para um ticket' })
  @ApiResponse({ status: 200, description: 'Mensagem enviada com sucesso', type: TicketMessage })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  sendMessage(@Body() body: SendMessageDto) {
    return this.ticketMessagesService.sendMessage(body);
  }
}
