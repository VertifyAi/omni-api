import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { Phone } from 'src/phones/entities/phone.entity';
import { PhonesModule } from 'src/phones/phones.module';
import { TicketMessagesModule } from '../ticket_messages/ticket_messages.module';
import { TicketMessage } from 'src/ticket_messages/entities/ticket_message.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Phone, TicketMessage]),
    PhonesModule,
    forwardRef(() => TicketMessagesModule),
    UsersModule,
    AreasModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
