import { 
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn 
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum IntegrationType {
  WHATSAPP_META = 'whatsapp_meta',
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: IntegrationType,
    default: IntegrationType.WHATSAPP_META
  })
  type: IntegrationType;

  @Column()
  name: string;

  @Column({ name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, company => company.integrations)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({
    type: 'json',
    nullable: true
  })
  config: {
    accessToken?: string;
    phoneNumberId?: string;
    wabaId?: string;
    tokenExpiresAt?: Date;
  };

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
