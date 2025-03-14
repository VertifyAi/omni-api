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

  private formatPhoneNumber(phoneNumber: string): { stateCode: string; number: string } {
    // Remove todos os caracteres não numéricos
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Extrai o código de área (DDD) e o número
    const stateCode = cleanNumber.substring(0, 2);
    const number = cleanNumber.substring(2);

    return { stateCode, number };
  }

  async findOneByPhone(phoneNumber: string): Promise<Phone | null> {
    const { stateCode, number } = this.formatPhoneNumber(phoneNumber);
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
    const { stateCode, number } = this.formatPhoneNumber(phoneNumber);
    
    const phone = this.phoneRepository.create({
      number,
      state_code: stateCode,
      country_code: '+55', // Código do Brasil
    });
    return this.phoneRepository.save(phone);
  }
}
