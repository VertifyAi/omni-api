import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { S3Service } from 'src/integrations/aws/s3.service';
import { FindAllCustomersDto } from './dto/find-all-customers.dto';
import { UploadFileDto } from './dto/upload-image.dto';
import { TicketsService } from 'src/tickets/tickets.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const profilePicture = await this.getWhatsappProfilePictureAndSaveOnS3(
        createCustomerDto.phone,
      );
      console.log('profilePicture', profilePicture);
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        profilePicture: profilePicture || '',
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
        profilePicture: profilePicture || '',
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

  async findAll(
    companyId: number,
    findAllCustomersDto: FindAllCustomersDto,
  ): Promise<{ customers: Customer[]; total: number }> {
    const { limit, page, search } = findAllCustomersDto;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { companyId };

    if (search) {
      where['name'] = ILike(`%${search}%`);
    }

    const [customers, total] = await this.customerRepository.findAndCount({
      where,
      skip,
      take: Number(limit),
      order: {
        name: 'ASC',
      },
    });

    return {
      customers,
      total,
    };
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

  private async getWhatsappProfilePictureAndSaveOnS3(
    phone: string,
  ): Promise<string | null> {
    try {
      console.log('phone', phone);
      console.log('process.env.RAPIDAPI_KEY', process.env.RAPIDAPI_KEY);
      console.log('process.env.RAPIDAPI_HOST', process.env.RAPIDAPI_HOST);

      // Primeira requisição para obter a URL da imagem de perfil
      const response = await axios.get(
        `https://whatsapp-profile-pic.p.rapidapi.com/wspic/url?phone=${phone}`,
        {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST,
          },
          timeout: 10000, // 10 segundos de timeout
        },
      );

      // A API retorna diretamente a URL da imagem como string
      const profilePictureUrl = response.data;
      console.log('profilePictureUrl', profilePictureUrl);

      // Validar se a URL da imagem é válida
      if (
        !profilePictureUrl ||
        typeof profilePictureUrl !== 'string' ||
        profilePictureUrl.trim() === ''
      ) {
        console.log('Profile picture URL not found or invalid');
        return null;
      }

      // Validar se é uma URL válida
      if (!profilePictureUrl.startsWith('http')) {
        console.log('Profile picture URL is not a valid HTTP URL');
        return null;
      }

      // Segunda requisição para baixar a imagem
      const profilePicture = await axios.get(profilePictureUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 segundos de timeout para download
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });

      console.log('profilePicture downloaded successfully');
      console.log('Content-Type:', profilePicture.headers['content-type']);
      console.log('Content-Length:', profilePicture.data.length);

      // Validar se a imagem foi baixada corretamente
      if (!profilePicture.data || profilePicture.data.length === 0) {
        console.log('Profile picture data is empty');
        return null;
      }

      // Definir mimetype padrão se não estiver disponível
      const mimetype = profilePicture.headers['content-type'] || 'image/jpeg';

      const s3Service = new S3Service();
      const s3Url = await s3Service.uploadFile({
        originalname: `${phone}_profile_pic`,
        buffer: profilePicture.data,
        mimetype: mimetype,
        size: profilePicture.data.length,
      });

      console.log('Image uploaded to S3:', s3Url);
      return s3Url;
    } catch (error) {
      console.error('Error downloading WhatsApp profile picture:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      // Retornar null em caso de erro para não quebrar o processo de criação do cliente
      return null;
    }
  }

  async uploadImage(id: string, file: UploadFileDto) {
    const customer = await this.findOneById(id);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const s3Service = new S3Service();
    const s3Url = await s3Service.uploadFile({
      originalname: file.originalname,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    return await this.customerRepository.update(id, {
      profilePicture: s3Url,
    });
  }

  async delete(companyId: number, id: string) {
    const customer = await this.findOne(companyId, id);
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (customer.tickets && customer.tickets.length > 0) {
      await Promise.all(
        customer.tickets.map(async (ticket) => {
          await this.ticketsService.delete(companyId, ticket.id.toString());
        })
      );
    }

    if (customer.profilePicture) {
      const s3Service = new S3Service();
      await s3Service.deleteFile(customer.profilePicture);
    }

    return await this.customerRepository.delete(parseInt(id));
  }
}
