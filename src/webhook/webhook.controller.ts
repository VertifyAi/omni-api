import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { HandleWebhookEventDto } from './dto/handle-webhook-event.dto';

@Controller('webhook')
export class WebhookController {
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ) {
    const expectedToken = process.env.META_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return challenge;
    }
    return 'Verification failed';
  }

  @Post()
  handleWebhookEvent(@Body() body: HandleWebhookEventDto) {
    console.log('📩 Mensagem recebida do WhatsApp:', body);
    return { status: 'received' };
  }
}
