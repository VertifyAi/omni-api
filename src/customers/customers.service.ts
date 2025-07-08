import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { S3Service } from 'src/integrations/aws/s3.service';
@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const profilePicture = await this.getWhatsappProfilePictureAndSaveOnS3(
        createCustomerDto.phone,
      );
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        profilePicture,
      });
      await this.customerRepository.save(customer);

      this.eventEmitter.emit('customer.created', {
        customerId: customer.id,
        companyId: customer.companyId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerStreetName: customer.streetName,
        customerStreetNumber: customer.streetNumber,
        customerCity: customer.city,
        customerState: customer.state,
        customerPhone: customer.phone,
        profilePicture: profilePicture,
      });
      return customer;
    } catch (error) {
      throw new InternalServerErrorException(`Error creating user: ${error}`);
    }
  }

  async findOneByPhone(
    phone: string,
    companyId: number,
  ): Promise<Customer | null> {
    try {
      const customer = await this.customerRepository.findOne({
        where: {
          phone,
          companyId,
        },
      });

      return customer;
    } catch (error) {
      console.log('error', error);
      throw new InternalServerErrorException(
        `Error searching for customer by phone ${phone}: ${error.message}`,
      );
    }
  }

  async findAll(companyId: number): Promise<Customer[]> {
    return this.customerRepository.find({
      where: {
        companyId,
      },
    });
  }

  async findOne(companyId: number, id: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id: parseInt(id), companyId },
      relations: ['tickets'],
    });
  }

  async findOneById(id: string): Promise<Customer | null> {
    return this.customerRepository.findOneBy({ id: parseInt(id) });
  }

  async update(
    companyId: number,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    try {
      const customer = await this.findOne(companyId, id);
      if (!customer) {
        throw new NotFoundException('Cliente não encontrado');
      }

      const updatedCustomer = await this.customerRepository.save({
        ...customer,
        name: updateCustomerDto.name ?? customer.name,
        email: updateCustomerDto.email ?? customer.email,
        streetName: updateCustomerDto.street_name ?? customer.streetName,
        streetNumber: updateCustomerDto.street_number ?? customer.streetNumber,
        city: updateCustomerDto.city ?? customer.city,
        state: updateCustomerDto.state ?? customer.state,
        phone: updateCustomerDto.phone ?? customer.phone,
      });

      return updatedCustomer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Erro ao atualizar cliente: ${error.message}`,
      );
    }
  }

  private async getWhatsappProfilePictureAndSaveOnS3(phone: string) {
    const response = await axios.get(
      `https://whatsapp-profile-pic.p.rapidapi.com/wspic/url?phone=${phone}`,
      {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': process.env.RAPIDAPI_HOST,
        },
      },
    );
    const profilePictureUrl = response.data.data.profile_pic_url;
    const profilePicture = await axios.get(profilePictureUrl, {
      responseType: 'arraybuffer',
    });
    const s3Service = new S3Service();
    const s3Url = await s3Service.uploadFile({
      originalname: phone,
      buffer: profilePicture.data,
      mimetype: profilePicture.headers['content-type'],
      size: profilePicture.data.length,
    });
    return s3Url;
  }
}
