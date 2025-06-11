import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('Usuário não autenticado ou sem empresa');
    }

    const hasActiveSubscription = await this.subscriptionService.hasActiveSubscription(user.companyId);
    
    if (!hasActiveSubscription) {
      throw new ForbiddenException('Assinatura inativa. Atualize seu plano para continuar usando o serviço.');
    }

    return true;
  }
} 