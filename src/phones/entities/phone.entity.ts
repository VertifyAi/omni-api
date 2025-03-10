import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity({
  name: 'phones',
})
export class Phone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: string;

  @Column({ length: 2 })
  state_code: string;

  @Column({ length: 3 })
  country_code: string;

  @Column({ nullable: true })
  company_id: number;

  @ManyToOne(() => Company, company => company.whatsappNumbers)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
