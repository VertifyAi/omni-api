import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { CustomersModule } from '../customers/customers.module';
import { CompaniesService } from 'src/companies/companies.service';
import { Company } from 'src/companies/entities/company.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketMessage, Company]),
    CustomersModule,
    TicketsModule,
    HttpModule,
    JwtModule,
    ConfigModule
  ],
  controllers: [TicketsController],
  providers: [TicketsService, CompaniesService],
  exports: [TicketsService],
})
export class TicketsModule {}
