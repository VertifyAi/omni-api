import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum TwilioIntegrationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

@Entity('twilio_integrations')
export class TwilioIntegration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  account_sid: string;

  @Column()
  auth_token: string;

  @Column()
  whatsapp_number: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'inactive', 'error'],
    default: 'pending'
  })
  status: TwilioIntegrationStatus;

  @Column({ type: 'json', nullable: true })
  config: {
    webhook_url: string;
    webhook_method: string;
    last_error?: string;
    last_error_date?: Date;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
} 