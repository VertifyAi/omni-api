import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketMessagesService } from 'src/ticket_messages/ticket_messages.service';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { PhonesService } from 'src/phones/phones.service';
import { TicketMessage } from 'src/ticket_messages/entities/ticket_message.entity';
import { Phone } from '../phones/entities/phone.entity';
import { TriageResult } from '../ticket_messages/vera-ai.service';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    private readonly phoneService: PhonesService,
    @Inject(forwardRef(() => TicketMessagesService))
    private readonly ticketMessagesService: TicketMessagesService
  ) {}

  async findAll(companyId: number): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { company_id: companyId },
      relations: ['area', 'user', 'messages'],
      order: {
        created_at: 'DESC'
      }
    });
  }

  async findByPhone(phone: Phone): Promise<Ticket | null> {
    return this.ticketRepository.findOne({
      where: { 
        customer_phone_id: phone.id,
        status: TicketStatus.OPEN 
      },
    });
  }

  async create(phone: Phone, subject: string): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      subject,
      customer_phone_id: phone.id,
      status: TicketStatus.OPEN,
    });
    return this.ticketRepository.save(ticket);
  }

  async findById(ticketId: number, companyId: number): Promise<Ticket | null> {
    return this.ticketRepository.findOne({
      where: { 
        id: ticketId,
        company_id: companyId 
      },
    });
  }

  async findMessages(ticketId: number): Promise<TicketMessage[]> {
    return this.ticketMessageRepository.find({
      where: { ticket_id: ticketId },
    });
  }

  async getTicketMessages(ticketId: number, companyId: number) {
    // Primeiro verifica se o ticket pertence à empresa
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, company_id: companyId }
    });

    if (!ticket) {
      throw new UnauthorizedException('Ticket não pertence a esta empresa');
    }

    const messages = await this.ticketMessageRepository.find({
      where: { ticket_id: ticketId },
      order: { id: 'ASC' },
    });

    if (!messages || messages.length === 0) {
      return [];
    }

    return messages;
  }

  async findOpenTicketByPhone(phoneNumber: string): Promise<Ticket | null> {
    const phone = await this.phoneService.findOneByPhone(phoneNumber);
    if (!phone) return null;
    return this.findByPhone(phone);
  }

  async createTicket(phoneNumber: string, subject: string): Promise<Ticket> {
    let phone = await this.phoneService.findOneByPhone(phoneNumber);
    
    // Se o telefone não existir, cria um novo
    if (!phone) {
      phone = await this.phoneService.create(phoneNumber);
    }

    return this.create(phone, subject);
  }

  async updateTicketTriage(ticketId: number, triageResult: TriageResult): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket não encontrado');
    }

    ticket.priority = triageResult.priority;
    ticket.summary = triageResult.summary;
    ticket.triaged = true;
    ticket.area_id = triageResult.suggestedAreaId;

    return this.ticketRepository.save(ticket);
  }
}
