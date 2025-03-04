import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(address: Address): Promise<Address> {
    return this.addressRepository.save(address);
  }

  async findOne(address: Address): Promise<Address | null> {
    return this.addressRepository.findOne({ where: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        country: address.country,
    } });
  }
}
