import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
}

export enum PlanType {
  ESSENCIAL = 'essencial',
  PROFISSIONAL = 'profissional',
  EMPRESARIAL = 'empresarial',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'stripe_subscription_id', unique: true })
  stripeSubscriptionId: string;

  @Column({ name: 'stripe_customer_id' })
  stripeCustomerId: string;

  @Column({ name: 'stripe_price_id' })
  stripePriceId: string;

  @Column({ name: 'stripe_product_id' })
  stripeProductId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: PlanType,
    name: 'plan_type',
  })
  planType: PlanType;

  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ name: 'trial_start', type: 'timestamp', nullable: true })
  trialStart: Date;

  @Column({ name: 'trial_end', type: 'timestamp', nullable: true })
  trialEnd: Date;

  @Column({ name: 'canceled_at', type: 'timestamp', nullable: true })
  canceledAt: Date;

  @Column({ name: 'monthly_attendance_limit', default: 300 })
  monthlyAttendanceLimit: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => Company, (company) => company.subscription)
  @JoinColumn({ name: 'company_id' })
  company: Company;
} 