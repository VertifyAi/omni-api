import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './services/subscription.service';
import { UsageService } from './services/usage.service';
import { StripeService } from './services/stripe.service';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { Subscription } from './entities/subscription.entity';
import { UsageTracking } from './entities/usage-tracking.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule,
    ConfigModule,
    TypeOrmModule.forFeature([Subscription, UsageTracking]),
  ],
  controllers: [BillingController],
  providers: [
    SubscriptionService,
    UsageService,
    StripeService,
    StripeWebhookService,
    SubscriptionGuard,
    UsageLimitGuard,
  ],
  exports: [
    SubscriptionService,
    UsageService,
    StripeService,
    StripeWebhookService,
    SubscriptionGuard,
    UsageLimitGuard,
  ],
})
export class BillingModule {} 