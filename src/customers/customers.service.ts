import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const customer = this.customerRepository.create(createCustomerDto);
      await this.customerRepository.save(customer);
      return customer;
    } catch (error) {
      throw new InternalServerErrorException(`Error creating user: ${error}`);
    }
  }

  async findOneByPhone(phone: string): Promise<Customer | null> {
    try {
      const customer = await this.customerRepository.findOneBy({
        phone,
      });

      return customer;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error searching for customer by phone ${phone}: ${error.message}`,
      );
    }
  }
}
