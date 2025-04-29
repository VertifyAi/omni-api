import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CompaniesController } from './companies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [CompaniesService],
  exports: [CompaniesService],
  controllers: [CompaniesController]
})
export class CompaniesModule {}
