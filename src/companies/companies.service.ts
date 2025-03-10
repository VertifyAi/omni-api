import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { PhonesService } from '../phones/phones.service';
import { AddressesService } from '../addresses/addresses.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      // Verifica se já existe empresa com este CNPJ
      const existingCompany = await this.companyRepository.findOne({
        where: { cnpj: createCompanyDto.cnpj }
      });

      if (existingCompany) {
        throw new ConflictException('CNPJ já cadastrado');
      }

      // Cria ou encontra o telefone
      let phone = await this.phonesService.findOneByPhone(createCompanyDto.phone);
      if (!phone) {
        phone = await this.phonesService.create(createCompanyDto.phone);
      }

      // Cria ou encontra o endereço
      let address = await this.addressesService.findOne(createCompanyDto.address);
      if (!address) {
        address = await this.addressesService.create(createCompanyDto.address);
      }

      const company = this.companyRepository.create({
        name: createCompanyDto.name,
        cnpj: createCompanyDto.cnpj,
        phone_id: phone.id,
        address_id: address.id
      });

      return await this.companyRepository.save(company);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Erro ao criar empresa: ' + error.message);
    }
  }
}
