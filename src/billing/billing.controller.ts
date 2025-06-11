import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { StripeService } from './services/stripe.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageService } from './services/usage.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RequireActiveSubscription } from './decorators/check-usage-limit.decorator';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('create-checkout-session')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Body() createCheckoutDto: CreateCheckoutSessionDto,
    @Request() req,
  ) {
    return await this.stripeService.createCheckoutSession(
      createCheckoutDto,
      req.user.email,
    );
  }

  @RequireActiveSubscription()
  @Post('create-portal-session')
  @HttpCode(HttpStatus.OK)
  async createPortalSession(@Request() req) {
    const subscription = await this.subscriptionService.findActiveByCompanyId(
      req.user.companyId,
    );
    
    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    return await this.stripeService.createCustomerPortalSession(
      subscription.stripeCustomerId,
    );
  }

  @RequireActiveSubscription()
  @Get('usage-stats')
  async getUsageStats(@Request() req) {
    return await this.usageService.getUsageStats(req.user.companyId);
  }

  @RequireActiveSubscription()
  @Get('subscription')
  async getSubscription(@Request() req) {
    return await this.subscriptionService.findActiveByCompanyId(req.user.companyId);
  }
} 