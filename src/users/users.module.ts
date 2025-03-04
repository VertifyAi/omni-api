import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PhonesModule } from 'src/phones/phones.module';
import { PhonesService } from 'src/phones/phones.service';
import { Phone } from 'src/phones/entities/phone.entity';
import { Address } from 'src/addresses/entities/address.entity';
import { AddressesModule } from 'src/addresses/addresses.module';
import { AddressesService } from 'src/addresses/addresses.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Phone, Address]), PhonesModule, AddressesModule],
  controllers: [UsersController],
  providers: [UsersService, PhonesService, AddressesService]
})
export class UsersModule {}
