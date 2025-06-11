import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { UsageLimitGuard } from '../guards/usage-limit.guard';
import { FeatureType } from '../entities/usage-tracking.entity';

export const CheckUsageLimit = (feature: FeatureType) => {
  return applyDecorators(
    UseGuards(AuthGuard, SubscriptionGuard, UsageLimitGuard),
    SetMetadata('feature', feature),
  );
};

export const RequireActiveSubscription = () => {
  return applyDecorators(
    UseGuards(AuthGuard, SubscriptionGuard),
  );
}; 