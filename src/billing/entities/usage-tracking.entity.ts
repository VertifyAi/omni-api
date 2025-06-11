import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';

export enum FeatureType {
  CHANNELS = 'channels',
  AI_AGENTS = 'ai_agents',
  MONTHLY_ATTENDANCES = 'monthly_attendances',
}

@Entity('usage_tracking')
@Index(['companyId', 'feature', 'periodStart'], { unique: true })
export class UsageTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({
    type: 'enum',
    enum: FeatureType,
  })
  feature: FeatureType;

  @Column({ name: 'current_usage', default: 0 })
  currentUsage: number;

  @Column({ name: 'usage_limit' })
  usageLimit: number;

  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  @Column({ name: 'is_unlimited', default: false })
  isUnlimited: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
} 