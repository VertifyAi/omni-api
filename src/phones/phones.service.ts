import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Phone } from './entities/phone.entity';

@Injectable()
export class PhonesService {
  constructor(
    @InjectRepository(Phone)
    private readonly phoneRepository: Repository<Phone>,
  ) {}

  async findOneByPhone(phoneNumber: string): Promise<Phone | null> {
    try {
      const number = phoneNumber.substring(5);
      const stateCode = phoneNumber.substring(3, 5);
      const countryCode = phoneNumber.substring(0, 3);
      return await this.phoneRepository.findOneBy({
        number,
        stateCode,
        countryCode,
      });
    } catch {
      throw new Error('Error while trying to find phone');
    }
  }

  async create(phoneNumber: string): Promise<Phone> {
    try {
      const countryCode = phoneNumber.substring(0, 3);
      const numberWithStateCode = phoneNumber.substring(3);
      const stateCode = numberWithStateCode.substring(0, 2);
      const number = numberWithStateCode.substring(2);

      const newPhone = this.phoneRepository.create({
        stateCode,
        number,
        countryCode,
      });

      const savedPhone = await this.phoneRepository.save(newPhone);

      return savedPhone;
    } catch (error) {
      console.error('Error details:', error);
      throw new Error('Error while trying to create phone');
    }
  }
  ƒ;
}
