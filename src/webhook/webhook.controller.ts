import { Controller, Post, Headers, Body, Get, Query } from '@nestjs/common';
import { WhatsappWebhookDto } from './dto/handle-incoming-message.dto';
import { TicketsService } from '../tickets/tickets.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly ticketsService: TicketsService) {}
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado com sucesso.');
        return challenge;
      } else {
        return 'Erro de verificação';
      }
    }
    return 'Sem parâmetros de verificação';
  }

  @Post()
  async handleIncomingMessage(
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: WhatsappWebhookDto,
  ) {
    return await this.ticketsService.handleIncomingMessage(body)
  }
}
