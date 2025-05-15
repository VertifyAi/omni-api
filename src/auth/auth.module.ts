import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';
import { User } from '../users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { UtilsModule } from 'src/utils/utils.module';
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    UtilsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: jwtConstants(configService).secret,
        signOptions: { expiresIn: '4h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AuthService, UsersService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
