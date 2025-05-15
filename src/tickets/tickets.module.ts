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
import { ChatGateway } from 'src/gateway/chat.gateway';
import { AgentsModule } from 'src/agents/agents.module';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { VeraiModule } from 'src/verai/verai.module';
import { VeraiService } from 'src/verai/verai.service';
import { UtilsModule } from 'src/utils/utils.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketMessage, Company, User]),
    CustomersModule,
    TicketsModule,
    HttpModule,
    JwtModule,
    ConfigModule,
    AgentsModule,
    UsersModule,
    VeraiModule,
    UtilsModule,
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    CompaniesService,
    ChatGateway,
    UsersService,
    VeraiService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
