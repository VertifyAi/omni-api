import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { SignUpDto } from 'src/auth/dto/sign-up.dto';
import { PhonesService } from 'src/phones/phones.service';
import { AddressesService } from 'src/addresses/addresses.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly ticketRepository: Repository<User>,
    private readonly phonesService: PhonesService,
    private readonly addressesService: AddressesService,
  ) {}

  async findOne(email: string): Promise<User | null> {
    return this.ticketRepository.findOne({ where: { email } });
  }

  async create(signUpDto: SignUpDto): Promise<User> {
    try {
      let phone = await this.phonesService.findOneByPhone(signUpDto.phone);

      if (!phone) {
        phone = await this.phonesService.create(signUpDto.phone);
      } else {
        throw new Error('Phone already exists');
      }

      let address = await this.addressesService.findOne(signUpDto.address);

      if (!address) {
        address = await this.addressesService.create(signUpDto.address);
      } else {
        throw new Error('Address already exists');
      }

      const user = new User();
      user.firstName = signUpDto.firstName;
      user.lastName = signUpDto.lastName;
      user.email = signUpDto.email;
      user.password = signUpDto.password;
      user.phoneId = phone.id;
      user.addressId = address.id;
      user.role = signUpDto.role;

      return await this.ticketRepository.save(user);
    } catch (error) {
      throw new Error(error);
    }
  }
}
