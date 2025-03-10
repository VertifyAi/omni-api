import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PhonesService } from 'src/phones/phones.service';
import { AddressesService } from 'src/addresses/addresses.service';
import * as bcrypt from 'bcrypt';
import { DeepPartial } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
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

      // Cria ou encontra o telefone
      const phoneNumber = createUserDto.phone;
      const stateCode = phoneNumber.substring(3, 5);
      const number = phoneNumber.substring(5);
      let phone = await this.phonesService.findByNumber(number, stateCode);
      if (!phone) {
        phone = await this.phonesService.create(createUserDto.phone);
      }

      // Cria ou encontra o endereço
      let address = await this.addressesService.findOne(createUserDto.address);
      if (!address) {
        address = await this.addressesService.create(createUserDto.address);
      }

      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = this.userRepository.create({
        name: createUserDto.firstName + ' ' + createUserDto.lastName,
        email: createUserDto.email,
        password: hashedPassword,
        phone: phone,
        address: address,
        area: { id: createUserDto.areaId },
        role: createUserDto.role
      } as DeepPartial<User>);

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof ConflictException) {
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
