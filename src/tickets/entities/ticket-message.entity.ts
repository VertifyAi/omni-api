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
  CUSTOMER = 'CUSTOMER',
  OMNIFY = 'OMNIFY',
}

export enum TicketMessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sender_identifier', nullable: true })
  senderIdentifier: string;

  @Column({
    type: 'longtext'
  })
  message: string;

  @Column({ name: 'sender_name', nullable: true })
  senderName: string;

  @Column({ name: 'sender_type' })
  senderType: TicketMessageSender

  @Column({ name: 'message_type', nullable: false })
  messageType: TicketMessageType;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketMessages)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
