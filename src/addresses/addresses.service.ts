import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(addressDto: CreateAddressDto): Promise<Address> {
    const address = this.addressRepository.create(addressDto);
    return this.addressRepository.save(address);
  }

  async findOne(addressDto: CreateAddressDto): Promise<Address | null> {
    return this.addressRepository.findOne({
      where: {
        street: addressDto.street,
        city: addressDto.city,
        state: addressDto.state,
        zip_code: addressDto.zip_code,
        country: addressDto.country,
        complement: addressDto.complement,
      },
    });
  }
}
