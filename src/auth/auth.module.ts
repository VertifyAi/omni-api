import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';
import { User } from '../users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { CompaniesService } from 'src/companies/companies.service';
import { UtilsModule } from 'src/utils/utils.module';
import { Company } from 'src/companies/entities/company.entity';
import { HttpModule } from '@nestjs/axios';
import { TicketsModule } from 'src/tickets/tickets.module';
import { ForgotPasswordToken } from './entities/forgot-password-tokens.entity';
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    CompaniesModule,
    UtilsModule,
    HttpModule,
    forwardRef(() => TicketsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: jwtConstants(configService).secret,
        signOptions: { expiresIn: '4h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Company, ForgotPasswordToken]),
  ],
  providers: [AuthService, UsersService, CompaniesService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
