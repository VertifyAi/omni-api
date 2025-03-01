import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { AreasModule } from './areas/areas.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketMessagesModule } from './ticket-messages/ticket-messages.module';
import { PhonesModule } from './phones/phones.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'omni',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    UsersModule,
    CompaniesModule,
    AreasModule,
    TicketsModule,
    TicketMessagesModule,
    PhonesModule,
    AddressesModule,
  ],
})
export class AppModule {}
