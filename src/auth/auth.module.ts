import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { PhonesService } from 'src/phones/phones.service';
import { Phone } from 'src/phones/entities/phone.entity';
import { PhonesModule } from 'src/phones/phones.module';
import { AddressesModule } from 'src/addresses/addresses.module';
import { AddressesService } from 'src/addresses/addresses.service';
import { Address } from 'src/addresses/entities/address.entity';
import { CompaniesModule } from 'src/companies/companies.module';
import { AreasModule } from 'src/areas/areas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Phone, Address]),
    JwtModule.register({
      global: true,
      secret: '6312659c690ce39a9f1b7819858bef8deedd7965c3a5822e845f0720c8c81dac',
      signOptions: { expiresIn: '4h' },
    }),
    UsersModule,
    PhonesModule,
    AddressesModule,
    CompaniesModule,
    AreasModule
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, PhonesService, AddressesService],
})
export class AuthModule {}
