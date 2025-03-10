import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phone } from './entities/phone.entity';

@Injectable()
export class PhonesService {
  constructor(
    @InjectRepository(Phone)
    private phoneRepository: Repository<Phone>,
  ) {}

  async findOneByPhone(phoneNumber: string): Promise<Phone | null> {
    const stateCode = phoneNumber.substring(3, 5);
    const number = phoneNumber.substring(5);
    return this.findByNumber(number, stateCode);
  }

  async findByNumber(number: string, stateCode: string): Promise<Phone | null> {
    return this.phoneRepository.findOne({
      where: {
        number,
        state_code: stateCode,
      },
    });
  }

  async create(phoneNumber: string): Promise<Phone> {
    const stateCode = phoneNumber.substring(3, 5);
    const number = phoneNumber.substring(5);
    const countryCode = phoneNumber.substring(0, 3);
    
    const phone = this.phoneRepository.create({
      number,
      state_code: stateCode,
      country_code: countryCode,
    });
    return this.phoneRepository.save(phone);
  }
}
