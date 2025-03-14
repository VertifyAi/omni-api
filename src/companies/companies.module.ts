import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { PhonesModule } from '../phones/phones.module';
import { AddressesModule } from '../addresses/addresses.module';
import { AreasModule } from '../areas/areas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    PhonesModule,
    AddressesModule,
    AreasModule
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService]
})
export class CompaniesModule {}
