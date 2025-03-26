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
import { IntegrationsModule } from './integrations/integrations.module';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'example',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      migrationsRun: true,
    }),
    UsersModule,
    CompaniesModule,
    AreasModule,
    TicketsModule,
    TicketMessagesModule,
    PhonesModule,
    AddressesModule,
    AuthModule,
    IntegrationsModule,
    WebhookModule,
  ],
})
export class AppModule {}
