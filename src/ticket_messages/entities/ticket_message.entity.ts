import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

export enum SenderEnum {
  CUSTOMER = 'customer',
  AGENT = 'agent',
}

@Entity({
  name: 'ticket_messages',
})
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticket_id: number;

  @Column({
    type: 'enum',
    enum: SenderEnum
  })
  sender: SenderEnum;

  @Column('text')
  message: string;

  @ManyToOne('Ticket', 'messages')
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @CreateDateColumn()
  created_at: Date;
}
