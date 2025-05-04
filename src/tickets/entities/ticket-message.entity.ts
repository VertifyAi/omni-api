import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

export enum TicketMessageSender {
  AI = 'AI',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER'
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column({
    type: 'longtext'
  })
  message: string;

  @Column({ name: 'sender_name' })
  senderName: string;

  @Column()
  sender: TicketMessageSender

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketMessages)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
