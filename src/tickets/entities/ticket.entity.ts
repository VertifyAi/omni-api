import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketMessage } from './ticket-message.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Agent } from 'src/agents/entities/agent.entity';
import { Team } from 'src/teams/entities/teams.entity';
import { User } from 'src/users/entities/user.entity';

export enum TicketStatus {
  AI = 'AI',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

export enum TicketPriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
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

  @Column({
    type: 'json',
    nullable: true,
  })
  state: string;

  @Column({ nullable: true, name: 'priority_level' })
  priorityLevel: TicketPriorityLevel;

  @Column({ name: 'llm_thread_id', nullable: true })
  llmThreadId: string;

  @Column({ name: 'freshdesk_ticket_id', nullable: true })
  freshdeskTicketId: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'agent_id', nullable: true })
  agentId: number;

  @Column({ name: 'area_id', nullable: true })
  areaId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'last_message_at', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => TicketMessage, (ticketMessage) => ticketMessage.ticket)
  ticketMessages: TicketMessage[];

  @ManyToOne(() => Company, (company) => company.ticket)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, (customer) => customer.tickets)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Agent, (agent) => agent.tickets)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @ManyToOne(() => Team, (team) => team.tickets)
  @JoinColumn({ name: 'area_id' })
  area: Team;

  @ManyToOne(() => User, (user) => user.tickets)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
