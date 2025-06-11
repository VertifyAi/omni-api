import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';
import { PlanType, SubscriptionStatus } from '../entities/subscription.entity';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async processWebhookEvent(event: any): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(session: Record<string, unknown>): Promise<void> {
    if (!session.metadata) {
      this.logger.error('No metadata found in checkout session');
      return;
    }

    const metadata = session.metadata as Record<string, string>;
    const companyId = parseInt(metadata.companyId);
    const monthlyAttendanceLimit = metadata.monthlyAttendanceLimit 
      ? parseInt(metadata.monthlyAttendanceLimit)
      : undefined;

    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await this.stripeService.getSubscription(session.subscription as string);
      const planType = this.subscriptionService.getPlanTypeByProductId(
        subscription.items.data[0].price.product as string
      );

      await this.subscriptionService.createSubscription({
        companyId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0].price.id,
        stripeProductId: subscription.items.data[0].price.product as string,
        status: subscription.status as SubscriptionStatus,
        planType,
        currentPeriodStart: new Date(this.getSubscriptionProperty(subscription, 'current_period_start') * 1000),
        currentPeriodEnd: new Date(this.getSubscriptionProperty(subscription, 'current_period_end') * 1000),
        monthlyAttendanceLimit: monthlyAttendanceLimit || this.getDefaultAttendanceLimit(planType),
      });

      this.logger.log(`Subscription created for company ${companyId}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Record<string, unknown>): Promise<void> {
    console.log('subscription', subscription);
    
    // Calcular currentPeriodEnd baseado no intervalo do plano
    const now = new Date((subscription as any).start_date * 1000);
    let currentPeriodEnd: Date;
    
    const plan = (subscription as any).plan;
    if (plan && plan.interval === 'month') {
      // Se for mensal, adicionar 30 dias
      currentPeriodEnd = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    } else {
      // Se não for mensal (anual ou outro), adicionar 1 ano
      currentPeriodEnd = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    }

    const payload = {
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: currentPeriodEnd,
      trialStart: new Date((subscription as any).trial_start * 1000),
      trialEnd: new Date((subscription as any).trial_end * 1000),
    }

    console.log('payload', payload);
    await this.subscriptionService.updateByStripeId(subscription.id as string, payload);

    this.logger.log(`Subscription updated: ${subscription.id} with interval: ${plan?.interval || 'unknown'}`);
  }

  private async handleSubscriptionDeleted(subscription: Record<string, unknown>): Promise<void> {
    await this.subscriptionService.updateByStripeId(subscription.id as string, {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    });

    this.logger.log(`Subscription canceled: ${subscription.id}`);
  }

  private async handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
    if (invoice.subscription) {
      await this.subscriptionService.updateByStripeId(invoice.subscription as string, {
        status: SubscriptionStatus.PAST_DUE,
      });

      this.logger.log(`Payment failed for subscription: ${invoice.subscription}`);
    }
  }

  private async handlePaymentSucceeded(invoice: Record<string, unknown>): Promise<void> {
    if (invoice.subscription) {
      await this.subscriptionService.updateByStripeId(invoice.subscription as string, {
        status: SubscriptionStatus.ACTIVE,
      });

      this.logger.log(`Payment succeeded for subscription: ${invoice.subscription}`);
    }
  }

  private getDefaultAttendanceLimit(planType: PlanType): number {
    const limits = {
      [PlanType.ESSENCIAL]: 300,
      [PlanType.PROFISSIONAL]: 1000,
      [PlanType.EMPRESARIAL]: 5000,
    };

    return limits[planType];
  }

  private getSubscriptionProperty(subscription: any, property: string): number {
    return subscription[property] || 0;
  }
} 