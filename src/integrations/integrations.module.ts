import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { Integration } from './entities/integration.entity';
import { TwilioModule } from 'src/twilio/twilio.module';
import { TwilioService } from 'src/twilio/twilio.service';
import { CompaniesModule } from 'src/companies/companies.module';
import { CompaniesService } from 'src/companies/companies.service';
import { PhonesModule } from 'src/phones/phones.module';
import { AddressesModule } from 'src/addresses/addresses.module';
import { AreasModule } from 'src/areas/areas.module';
import { Company } from '../companies/entities/company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, Company]),
    ConfigModule,
    TwilioModule,
    CompaniesModule,
    PhonesModule,
    AddressesModule,
    AreasModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, TwilioService, CompaniesService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {} 