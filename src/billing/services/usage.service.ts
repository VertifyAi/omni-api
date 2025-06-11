import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageTracking, FeatureType } from '../entities/usage-tracking.entity';
import { SubscriptionService } from './subscription.service';
import { UsageStatsDto } from '../dto/usage-stats.dto';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageTracking)
    private readonly usageRepository: Repository<UsageTracking>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async checkUsageLimit(companyId: number, feature: FeatureType): Promise<boolean> {
    const subscription = await this.subscriptionService.findActiveByCompanyId(companyId);
    if (!subscription) {
      throw new ForbiddenException('Nenhuma assinatura ativa encontrada');
    }

    const usage = await this.getCurrentUsage(companyId, feature);
    
    // Se for ilimitado, permite
    if (usage.isUnlimited) {
      return true;
    }

    // Verifica se excedeu o limite
    if (usage.currentUsage >= usage.usageLimit) {
      throw new ForbiddenException(`Limite de ${feature} excedido`);
    }

    return true;
  }

  async incrementUsage(companyId: number, feature: FeatureType): Promise<void> {
    const subscription = await this.subscriptionService.findActiveByCompanyId(companyId);
    if (!subscription) {
      throw new ForbiddenException('Nenhuma assinatura ativa encontrada');
    }

    const usage = await this.getCurrentUsage(companyId, feature);
    
    // Se for ilimitado, não incrementa contador
    if (!usage.isUnlimited) {
      await this.usageRepository.update(usage.id, {
        currentUsage: usage.currentUsage + 1,
      });
    }
  }

  async decrementUsage(companyId: number, feature: FeatureType): Promise<void> {
    const usage = await this.getCurrentUsage(companyId, feature);
    
    if (!usage.isUnlimited && usage.currentUsage > 0) {
      await this.usageRepository.update(usage.id, {
        currentUsage: usage.currentUsage - 1,
      });
    }
  }

  async getCurrentUsage(companyId: number, feature: FeatureType): Promise<UsageTracking> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let usage = await this.usageRepository.findOne({
      where: {
        companyId,
        feature,
        periodStart: startOfMonth,
      },
    });

    if (!usage) {
      // Criar registro de uso para o mês atual
      const subscription = await this.subscriptionService.findActiveByCompanyId(companyId);
      if (!subscription) {
        throw new NotFoundException('Assinatura não encontrada');
      }

      const limits = this.subscriptionService.getPlanLimits(
        subscription.planType,
        subscription.monthlyAttendanceLimit
      );

      const featureLimit = limits[feature === FeatureType.CHANNELS ? 'channels' :
                                  feature === FeatureType.AI_AGENTS ? 'aiAgents' : 'monthlyAttendances'];

      usage = this.usageRepository.create({
        companyId,
        feature,
        currentUsage: 0,
        usageLimit: featureLimit.limit,
        isUnlimited: featureLimit.isUnlimited,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
      });

      await this.usageRepository.save(usage);
    }

    return usage;
  }

  async getUsageStats(companyId: number): Promise<UsageStatsDto> {
    const subscription = await this.subscriptionService.findActiveByCompanyId(companyId);
    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    const [channelsUsage, agentsUsage, attendancesUsage] = await Promise.all([
      this.getCurrentUsage(companyId, FeatureType.CHANNELS),
      this.getCurrentUsage(companyId, FeatureType.AI_AGENTS),
      this.getCurrentUsage(companyId, FeatureType.MONTHLY_ATTENDANCES),
    ]);

    const daysUntilReset = Math.ceil(
      (attendancesUsage.periodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      planType: subscription.planType,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      usage: {
        channels: {
          current: channelsUsage.currentUsage,
          limit: channelsUsage.usageLimit,
          isUnlimited: channelsUsage.isUnlimited,
        },
        aiAgents: {
          current: agentsUsage.currentUsage,
          limit: agentsUsage.usageLimit,
          isUnlimited: agentsUsage.isUnlimited,
        },
        monthlyAttendances: {
          current: attendancesUsage.currentUsage,
          limit: attendancesUsage.usageLimit,
          isUnlimited: attendancesUsage.isUnlimited,
        },
      },
      daysUntilReset,
    };
  }

  async resetMonthlyUsage(): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reset apenas atendimentos mensais
    await this.usageRepository.update(
      {
        feature: FeatureType.MONTHLY_ATTENDANCES,
        periodStart: startOfMonth,
      },
      {
        currentUsage: 0,
      }
    );
  }
} 