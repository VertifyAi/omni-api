import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PhonesService } from 'src/phones/phones.service';
import { AddressesService } from 'src/addresses/addresses.service';
import { CompaniesService } from 'src/companies/companies.service';
import { AreasService } from 'src/areas/areas.service';
import * as bcrypt from 'bcrypt';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
    private readonly companiesService: CompaniesService,
    private readonly areasService: AreasService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Verifica se o usuário já existe
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }

      const user = this.userRepository.create();
      user.name = createUserDto.firstName + ' ' + createUserDto.lastName;
      user.email = createUserDto.email;
      user.password = await bcrypt.hash(createUserDto.password, 10);

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

      user.phone = userPhone;

      // Cria ou encontra o endereço do usuário
      let userAddress = await this.addressesService.findOne(createUserDto.address);
      if (!userAddress) {
        userAddress = await this.addressesService.create(createUserDto.address);
      }

      user.address = userAddress;

      // Cria a empresa
      const company = await this.companiesService.create(createUserDto.company, user.id);

      user.company = company;
      
      // Busca a área administrativa que foi criada automaticamente
      const areas = await this.areasService.findByCompanyId(company.id);
      const area = areas.find(a => a.name === 'Administrativo');
      
      if (!area) {
        throw new Error('Área administrativa não encontrada');
      }

      user.area = area;

      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      user.password = hashedPassword;

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Erro ao criar usuário: ' + error.message);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['phone', 'address', 'company', 'area']
    });
  }

  async findAllByCompany(companyId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { company: { id: companyId } },
      relations: ['phone', 'address', 'company', 'area']
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['phone', 'address', 'company', 'area']
    });

    if (!user) {
      throw new NotFoundException(`Usuário #${id} não encontrado`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['phone', 'address', 'company', 'area']
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Se estiver atualizando o email, verifica se já existe
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }
    }

    // Se estiver atualizando a senha, faz o hash
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Atualiza o usuário
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async validateUser(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  async createCompanyUser(companyId: number, createUserDto: CreateCompanyUserDto): Promise<User> {
    // Verifica se a empresa existe
    const company = await this.companiesService.findOne(companyId);
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Verifica se já existe usuário com este email
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Cria o usuário
    const user = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
      company: company
    });

    return this.userRepository.save(user);
  }
}
