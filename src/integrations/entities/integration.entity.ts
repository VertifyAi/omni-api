import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { WhatsappIntegrationDto } from '../dto/whatsapp-integration.dto';
import { FreshdeskIntegrationDto } from '../dto/freshdesk-integration.dto';

export enum IntegrationType {
  WHATSAPP = 'WHATSAPP',
  FRESHDESK = 'FRESHDESK',
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: IntegrationType;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({
    type: 'json',
    transformer: {
      to: (value: WhatsappIntegrationDto | FreshdeskIntegrationDto) =>
        JSON.stringify(value),
      from: (value: string) => value,
    },
  })
  config: WhatsappIntegrationDto | FreshdeskIntegrationDto;

  @Column()
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.integration)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
