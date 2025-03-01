import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TicketMessagesService } from './ticket-messages.service';
import { HandleWebhookDto } from './dto/handle-webhook.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('ticket-messages')
export class TicketMessagesController {
  constructor(private readonly ticketMessagesService: TicketMessagesService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: HandleWebhookDto) {
    return this.ticketMessagesService.processIncomingMessage(body);
  }

  @Post('send-message')
  @HttpCode(HttpStatus.OK)
  sendMessage(@Body() body: SendMessageDto) {
    return this.ticketMessagesService.sendMessage(body);
  }
}
