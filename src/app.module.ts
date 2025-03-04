import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { AreasModule } from './areas/areas.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketMessagesModule } from './ticket_messages/ticket_messages.module';
import { PhonesModule } from './phones/phones.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'example',
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
    AuthModule,
  ],
})
export class AppModule {}
