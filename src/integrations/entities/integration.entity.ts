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

export enum IntegrationType {
  WHATSAPP = 'WHATSAPP',
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: IntegrationType;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column()
  config: string;

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
