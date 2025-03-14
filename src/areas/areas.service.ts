import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async findOne(id: number): Promise<Area | null> {
    return this.areaRepository.findOne({ 
      where: { id },
      relations: ['company']
    });
  }

  async findByCompanyId(companyId: number): Promise<Area[]> {
    return this.areaRepository.find({
      where: { company_id: companyId },
      relations: ['company']
    });
  }

  async create(createAreaDto: CreateAreaDto): Promise<Area> {
    const area = this.areaRepository.create(createAreaDto);
    return this.areaRepository.save(area);
  }
}
