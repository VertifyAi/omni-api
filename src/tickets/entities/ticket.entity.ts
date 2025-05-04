import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { TicketMessage } from './ticket-message.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Agent } from 'src/agents/entities/agent.entity';

export enum TicketStatus {
  AI = 'AI',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: TicketStatus;

  @Column()
  channel: string;

  @Column()
  score: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'agent_id'})
  agentId: number;

  @Column({ name: 'customer_id' })
  customerId: number;
  
  @Column({ name: 'area_id'})
  areaId: number

  @Column({ name: 'company_id'})
  companyId: number

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;
  
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => TicketMessage, ticketMessage => ticketMessage.ticket)
  ticketMessages: TicketMessage[];

  @ManyToOne(() => Company, company => company.ticket)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, customer => customer.ticket)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Agent, agent => agent.tickets)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
} 