import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PhonesService } from 'src/phones/phones.service';
import { AddressesService } from 'src/addresses/addresses.service';
import { CompaniesService } from 'src/companies/companies.service';
import { AreasService } from 'src/areas/areas.service';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
    private readonly companiesService: CompaniesService,
    private readonly areasService: AreasService,
  ) {}

  async findOne(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Verifica se o usuário já existe
      const existingUser = await this.findOne(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }

      // Verifica se as senhas conferem
      if (createUserDto.password !== createUserDto.passwordConfirmation) {
        throw new BadRequestException('As senhas não conferem');
      }

      // Cria ou encontra o telefone do usuário
      const userPhoneNumber = createUserDto.phone;
      const userStateCode = userPhoneNumber.substring(1, 3);
      const userNumber = userPhoneNumber.substring(5).replace('-', '');
      let userPhone = await this.phonesService.findByNumber(userNumber, userStateCode);
      if (!userPhone) {
        userPhone = await this.phonesService.create(createUserDto.phone);
      }

      // Cria ou encontra o endereço do usuário
      let userAddress = await this.addressesService.findOne(createUserDto.address);
      if (!userAddress) {
        userAddress = await this.addressesService.create(createUserDto.address);
      }

      // Cria a empresa
      const company = await this.companiesService.create(createUserDto.company);
      
      // Busca a área administrativa que foi criada automaticamente
      const areas = await this.areasService.findByCompanyId(company.id);
      const area = areas.find(a => a.name === 'Administrativo');
      
      if (!area) {
        throw new Error('Área administrativa não encontrada');
      }

      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      
      const user = this.userRepository.create({
        name: createUserDto.firstName + ' ' + createUserDto.lastName,
        email: createUserDto.email,
        password: hashedPassword,
        phone: userPhone,
        address: userAddress,
        area: area,
        company: company,
        role: createUserDto.role
      } as DeepPartial<User>);

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Erro ao criar usuário: ' + error.message);
    }
  }

  async validatePassword(email: string, password: string): Promise<boolean> {
    const user = await this.findOne(email);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }
}
