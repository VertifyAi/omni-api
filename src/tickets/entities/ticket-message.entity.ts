import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  message: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketMessages)
  ticket: Ticket;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
