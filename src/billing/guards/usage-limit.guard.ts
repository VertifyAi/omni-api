import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from '../services/usage.service';
import { FeatureType } from '../entities/usage-tracking.entity';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly usageService: UsageService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<FeatureType>('feature', context.getHandler());
    
    if (!feature) {
      return true; // Se não tem feature definida, permite
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      return false;
    }

    // Verifica se pode usar a feature (se não excedeu limite)
    await this.usageService.checkUsageLimit(user.companyId, feature);
    
    return true;
  }
} 