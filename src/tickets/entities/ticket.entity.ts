import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum TicketStatus {
  NEW = 'new',
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

  @Column()
  customerPhoneId: number;

  @Column()
  status: TicketStatus;

  @Column()
  subject: string;

  @Column()
  areaId: number;

  @Column()
  companyId: number;
}
