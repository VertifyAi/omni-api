import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, PlanType } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async findActiveByCompanyId(companyId: number): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['company'],
    });
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
      relations: ['company'],
    });
  }

  async createSubscription(subscriptionData: Partial<Subscription>): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create(subscriptionData);
    return await this.subscriptionRepository.save(subscription);
  }

  async updateSubscription(id: number, updateData: Partial<Subscription>): Promise<Subscription> {
    await this.subscriptionRepository.update(id, updateData);
    const updated = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    
    if (!updated) {
      throw new NotFoundException('Subscription not found');
    }
    
    return updated;
  }

  async updateByStripeId(stripeSubscriptionId: string, updateData: Partial<Subscription>): Promise<Subscription> {
    const subscription = await this.findByStripeSubscriptionId(stripeSubscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    
    return await this.updateSubscription(subscription.id, updateData);
  }

  getPlanLimits(planType: PlanType, monthlyAttendanceLimit?: number) {
    const limits = {
      [PlanType.ESSENCIAL]: {
        channels: { limit: 1, isUnlimited: false },
        aiAgents: { limit: 1, isUnlimited: false },
        monthlyAttendances: { limit: 300, isUnlimited: false },
      },
      [PlanType.PROFISSIONAL]: {
        channels: { limit: -1, isUnlimited: true },
        aiAgents: { limit: 2, isUnlimited: false },
        monthlyAttendances: { limit: 1000, isUnlimited: false },
      },
      [PlanType.EMPRESARIAL]: {
        channels: { limit: -1, isUnlimited: true },
        aiAgents: { limit: -1, isUnlimited: true },
        monthlyAttendances: { 
          limit: monthlyAttendanceLimit || 5000, 
          isUnlimited: false 
        },
      },
    };

    return limits[planType];
  }

  getPlanTypeByProductId(productId: string): PlanType {
    const productMap = {
      'prod_S4pWVf0oiJPawZ': PlanType.ESSENCIAL,
      'prod_SFLn7s9TgvayWC': PlanType.PROFISSIONAL,
      // Adicione o ID do produto empresarial quando tiver
    };

    return productMap[productId] || PlanType.ESSENCIAL;
  }

  async hasActiveSubscription(companyId: number): Promise<boolean> {
    const subscription = await this.findActiveByCompanyId(companyId);
    return !!subscription && subscription.currentPeriodEnd > new Date();
  }
} 