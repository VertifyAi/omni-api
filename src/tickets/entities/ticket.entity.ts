import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { TicketMessage } from '../../ticket_messages/entities/ticket_message.entity';
import { TicketPriority } from '../enums/ticket-priority.enum';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

@Entity({
  name: 'tickets',
})
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.LOW,
  })
  priority: TicketPriority;

  @Column('text', { nullable: true })
  summary: string;

  @Column({ default: false })
  triaged: boolean;

  @Column()
  subject: string;

  @Column({ name: 'customer_phone_id' })
  customer_phone_id: number;

  @Column({ name: 'area_id' })
  area_id: number;

  @Column({ name: 'company_id' })
  company_id: number;

  @Column({ name: 'user_id', nullable: true })
  user_id: number;

  @ManyToOne('Area', 'tickets')
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne('Company', 'tickets')
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne('User', 'tickets')
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany('TicketMessage', 'ticket')
  messages: TicketMessage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true, type: 'timestamp' })
  closed_at: Date;
}
