import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

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

  @Column({ name: 'company_id', nullable: true })
  company_id: number;

  @ManyToOne('Company', 'phones')
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany('User', 'phone')
  users: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
