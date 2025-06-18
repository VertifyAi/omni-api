import { 
  Controller, 
  Post, 
  Headers, 
  Body, 
  Get, 
  Query, 
  HttpCode, 
  HttpStatus, 
  Logger,
} from '@nestjs/common';
import { WhatsappWebhookDto } from './dto/handle-incoming-message.dto';
import { TicketsService } from '../tickets/tickets.service';
import { StripeService } from 'src/billing/services/stripe.service';
import { StripeWebhookService } from 'src/billing/services/stripe-webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly stripeService: StripeService,
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

  // WhatsApp webhook verification
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

  // WhatsApp incoming messages
  @Post()
  async handleIncomingMessage(
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: WhatsappWebhookDto,
  ) {
    console.log('body', JSON.stringify(body, null, 2));
    return await this.ticketsService.handleIncomingMessage(body);
  }

  // Stripe webhook
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('payload', payload);
    if (!payload) {
      this.logger.error('No payload received');
      return;
    }
    
    let event;
    
    try {
      event = this.stripeService.constructEvent(payload, signature);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return;
    }

    // Delegar todo o processamento para o serviço dedicado
    try {
      await this.stripeWebhookService.processWebhookEvent(event);
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
    }

    return { received: true };
  }
}
