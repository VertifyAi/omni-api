import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketMessagesController } from './ticket_messages.controller';
import { TicketMessagesService } from './ticket_messages.service';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';
import { PhonesModule } from '../phones/phones.module';
import { TicketMessage } from './entities/ticket_message.entity';
import { TicketMessagesGateway } from './ticket_messages.gateway';
import { VeraAIService } from './vera-ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketMessage]),
    forwardRef(() => TicketsModule),
    UsersModule,
    PhonesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TicketMessagesController],
  providers: [TicketMessagesService, TicketMessagesGateway, VeraAIService],
  exports: [TicketMessagesService],
})
export class TicketMessagesModule {}
