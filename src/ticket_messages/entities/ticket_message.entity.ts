import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

export enum SenderEnum {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  SYSTEM = 'system',
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticket_id: number;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: SenderEnum,
    default: SenderEnum.CUSTOMER,
  })
  sender: SenderEnum;

  @Column({ nullable: true })
  whatsapp_number: string;

  @Column()
  whatsapp_message_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;
}
