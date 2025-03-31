import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async findOne(id: number): Promise<Area | null> {
    return this.areaRepository.findOne({ 
      where: { id },
      relations: ['company', 'users']
    });
  }

  async findByCompanyId(companyId: number): Promise<Area[]> {
    return this.areaRepository.find({
      where: { company_id: companyId },
      relations: ['company', 'users']
    });
  }

  async create(companyId: number, createAreaDto: CreateAreaDto): Promise<Area> {
    const company = await this.companiesService.findOne(companyId);
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Busca todos os usuários
    const users = await Promise.all(
      createAreaDto.users.map(async (userId) => {
        const user = await this.usersService.findOne(userId.toString());
        if (!user) {
          throw new NotFoundException(`Usuário #${userId} não encontrado`);
        }
        return user;
      })
    );

    console.log('users', users);
    const area = this.areaRepository.create({
      ...createAreaDto,
      company,
      users
    });
    console.log('area', area);
    return this.areaRepository.save(area);
  }

  async findAll(): Promise<Area[]> {
    return this.areaRepository.find({
      relations: ['company', 'users']
    });
  }
}
