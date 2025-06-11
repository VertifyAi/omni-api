import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from '../dto/create-checkout-session.dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  async createCheckoutSession(
    createCheckoutDto: CreateCheckoutSessionDto,
    userEmail: string,
  ): Promise<{ url: string }> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price: createCheckoutDto.priceId,
            quantity: 1,
          },
        ],
        success_url: `${this.configService.get('FRONTEND_URL')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/billing/cancel`,
        customer_email: userEmail,
        metadata: {
          companyId: createCheckoutDto.companyId.toString(),
          monthlyAttendanceLimit: createCheckoutDto.monthlyAttendanceLimit?.toString() || '',
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          trial_period_days: 30,
        },
        tax_id_collection: {
          enabled: true,
        },
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session URL');
      }

      return { url: session.url };
    } catch (error) {
      throw new BadRequestException(`Erro ao criar sessão de checkout: ${error.message}`);
    }
  }

  async createCustomerPortalSession(customerId: string): Promise<{ url: string }> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${this.configService.get('FRONTEND_URL')}/billing`,
      });

      return { url: session.url };
    } catch (error) {
      throw new BadRequestException(`Erro ao criar portal do cliente: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      throw new BadRequestException(`Erro ao buscar assinatura: ${error.message}`);
    }
  }

  async getProduct(productId: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.retrieve(productId);
    } catch (error) {
      throw new BadRequestException(`Erro ao buscar produto: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      throw new BadRequestException(`Erro ao cancelar assinatura: ${error.message}`);
    }
  }

  constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }
} 