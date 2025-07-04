import {
  TicketPriorityLevel,
  TicketStatus,
} from 'src/tickets/entities/ticket.entity';

export class TicketCreatedEvent {
  constructor(
    public readonly ticketId: number,
    public readonly customerId: number,
    public readonly companyId: number,
    public readonly customerName: string,
    public readonly customerPhone: string,
    public readonly initialMessages: { content: string; type: string }[],
  ) {}
}

export class TicketMessageCreatedEvent {
  constructor(
    public readonly ticketId: number,
    public readonly companyId: number,
    public readonly messageContent: string,
    public readonly messageType: string,
    public readonly senderType: string,
    public readonly senderName: string,
    public readonly freshdeskTicketId?: number,
  ) {}
}

export class TicketStatusChangedEvent {
  constructor(
    public readonly ticketId: number,
    public readonly companyId: number,
    public readonly newStatus: TicketStatus,
    public readonly oldStatus: TicketStatus,
    public readonly changedByUserName: string,
    public readonly messageSentToCustomer: string,
    public readonly freshdeskTicketId?: number,
    public readonly newPriorityLevel?: TicketPriorityLevel,
  ) {}
}

export class CustomerCreatedEvent {
  constructor(
    public readonly customerId: number,
    public readonly companyId: number,
    public readonly customerName: string,
    public readonly customerPhone: string,
    public readonly customerEmail: string,
    public readonly customerStreetName: string,
    public readonly customerStreetNumber: string,
    public readonly customerCity: string,
    public readonly customerState: string,
  ) {}
}
