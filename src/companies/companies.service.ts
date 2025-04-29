import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async createCompany(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(createCompanyDto);
    await this.companyRepository.save(company);
    return company;
  }

  async findCompanyByPhone(phone: string): Promise<Company | null> {
    const company = await this.companyRepository.findOneBy({
      phone,
    });

    return company;
  }
}
