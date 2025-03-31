import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { PhonesService } from '../phones/phones.service';
import { AddressesService } from '../addresses/addresses.service';
import { AreasService } from '../areas/areas.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
    private readonly areasService: AreasService,
  ) {}

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ['address', 'phones']
    });
  }

  async findOne(id: number): Promise<Company | null> {
    return this.companyRepository.findOne({ 
      where: { id },
      relations: ['address', 'phones'] 
    });
  }

  async create(createCompanyDto: CreateCompanyDto, adminUserId: number): Promise<Company> {
    try {
      // Verifica se já existe empresa com este CNPJ
      const existingCompany = await this.companyRepository.findOne({
        where: { taxId: createCompanyDto.cnpj }
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

      // Cria a empresa com o endereço
      const company = await this.companyRepository.save({
        name: createCompanyDto.name,
        cnpj: createCompanyDto.cnpj,
        phones: [phone],
        address: address // Vincula o endereço diretamente
      });

      // Cria a área administrativa
      await this.areasService.create(company.id, {
        name: 'Administrativo',
        description: 'Área administrativa da empresa',
        users: [adminUserId]
      });

      console.log('passou do create');

      // Retorna a empresa com suas relações
      const savedCompany = await this.companyRepository.findOne({
        where: { id: company.id },
        relations: ['address', 'phones']
      });

      if (!savedCompany) {
        throw new NotFoundException('Empresa não encontrada após criação');
      }

      return savedCompany;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Erro ao criar empresa: ' + error.message);
    }
  }
}
