import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum SenderEnum {
  CUSTOMER = 'customer',
  AGENT = 'agent',
}

@Entity({
  name: 'ticket_messsages',
})
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticketId: number;

  @Column()
  costumerPhoneId: number;

  @Column()
  sender: SenderEnum;

  @Column()
  message: string;
}
