import { forwardRef, Inject, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketMessagesService } from 'src/ticket_messages/ticket_messages.service';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { PhonesService } from 'src/phones/phones.service';
import { TicketMessage } from 'src/ticket_messages/entities/ticket_message.entity';
import { Phone } from '../phones/entities/phone.entity';
import { TriageResult } from '../ticket_messages/vera-ai.service';
import { AreasService } from '../areas/areas.service';
import { CompaniesService } from '../companies/companies.service';
import { TicketPriority } from './enums/ticket-priority.enum';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    private readonly phoneService: PhonesService,
    private readonly areasService: AreasService,
    private readonly companiesService: CompaniesService,
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
    // Busca a área administrativa da empresa do telefone
    const areas = await this.areasService.findByCompanyId(phone.company_id);
    const area = areas.find(a => a.name === 'Administrativo');
    
    if (!area) {
      throw new Error('Área administrativa não encontrada');
    }

    const ticket = this.ticketRepository.create({
      subject,
      customer_phone_id: phone.id,
      status: TicketStatus.OPEN,
      area_id: area.id,
      company_id: phone.company_id
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
      // Busca a primeira empresa para usar como padrão
      const companies = await this.companiesService.findAll();
      if (!companies || companies.length === 0) {
        throw new Error('Nenhuma empresa encontrada');
      }
      const defaultCompany = companies[0];
      phone = await this.phoneService.create(phoneNumber, defaultCompany.id);
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

  async createOrUpdateFromWhatsApp(data: { customerPhone: string; message: string; companyId: number }) {
    // Procura por um ticket aberto do cliente
    let ticket = await this.ticketRepository.findOne({
      where: {
        customer_phone_id: parseInt(data.customerPhone),
        company_id: data.companyId,
        status: TicketStatus.OPEN,
      },
    });

    // Se não encontrar, cria um novo
    if (!ticket) {
      ticket = this.ticketRepository.create({
        customer_phone_id: parseInt(data.customerPhone),
        company_id: data.companyId,
        status: TicketStatus.OPEN,
        priority: TicketPriority.LOW,
        summary: data.message.substring(0, 100), // Primeiros 100 caracteres como resumo
        subject: 'Novo contato via WhatsApp',
      });
    }

    return this.ticketRepository.save(ticket);
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    return ticket;
  }

  async update(id: number, data: Partial<Ticket>) {
    const ticket = await this.findOne(id);
    Object.assign(ticket, data);
    return this.ticketRepository.save(ticket);
  }
}
