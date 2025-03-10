import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity({
  name: 'areas',
})
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @ManyToOne(() => Company, company => company.areas)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => User, user => user.area)
  users: User[];

  @OneToMany(() => Ticket, ticket => ticket.area)
  tickets: Ticket[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 