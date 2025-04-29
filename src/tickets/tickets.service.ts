import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { WhatsappWebhookDto } from '../webhook/dto/handle-incoming-message.dto';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateAITicketMessageDto } from './dto/create-ai-ticket-message.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly ticketMessageRepository: Repository<TicketMessage>,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
    private readonly httpService: HttpService,
  ) {}

  async handleIncomingMessage(
    createTicketMessageDto: WhatsappWebhookDto,
  ): Promise<void> {
    const company = await this.companiesService.findCompanyByPhone(
      createTicketMessageDto.entry[0].changes[0].value.metadata
        .display_phone_number,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let customer = await this.customersService.findOneByPhone(
      createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
    );

    if (!customer) {
      customer = await this.customersService.create({
        phone:
          createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
        name: createTicketMessageDto.entry[0].changes[0].value.contacts[0]
          .profile.name,
      } as CreateCustomerDto);
    }

    let ticket = await this.ticketRepository.findOneBy({
      customerId: customer.id,
      status: TicketStatus.OPEN,
    });

    if (!ticket) {
      ticket = this.ticketRepository.create({
        status: TicketStatus.OPEN,
        customerId: customer.id,
        companyId: company.id,
        channel: createTicketMessageDto.entry[0].changes[0].value.messaging_product
      });
      await this.ticketRepository.save(ticket);
    }

    const ticketMessage = this.ticketMessageRepository.create({
      phone: createTicketMessageDto.entry[0].changes[0].value.messages[0].from,
      message:
        createTicketMessageDto.entry[0].changes[0].value.messages[0].text.body,
      customerName:
        createTicketMessageDto.entry[0].changes[0].value.contacts[0].profile
          .name,
      ticketId: ticket.id,
    });
    await this.ticketMessageRepository.save(ticketMessage);

    const webhookData = {
      type: createTicketMessageDto.entry[0].changes[0].value.messages[0].type,
      content:
        createTicketMessageDto.entry[0].changes[0].value.messages[0].text
          ?.body || null,
      audio:
        createTicketMessageDto.entry[0].changes[0].value.messages[0].type ===
        'audio'
          ? createTicketMessageDto.entry[0].changes[0].value.messages[0]
          : null,
      ticketId: ticket.id,
      customerPhone: ticketMessage.phone,
      customerName: ticketMessage.customerName,
    };

    try {
      await lastValueFrom(this.httpService.post(
        'https://n8n.vertify.com.br/webhook-test/7e33648b-9146-466f-ae26-cd8959fc729e',
        webhookData,
      ));
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }

  async findAllTickets(companyId: number) {
    return await this.ticketRepository.find({
      where: {
        companyId
      },
      relations: ['company', 'customer']
    })
  }

  async createAITicketMessage(createAITicketMessage: CreateAITicketMessageDto) {
    const ticket = this.ticketMessageRepository.create({
      phone: '5511914403625',
      message: createAITicketMessage.content,
      ticketId: createAITicketMessage.ticketId,
    })
    console.log(ticket)
  }
}
