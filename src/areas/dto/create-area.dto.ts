import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from '../../companies/entities/company.entity';

export class CreateAreaDto {
  @ApiProperty({ description: 'Nome da área' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição da área' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Empresa à qual a área pertence' })
  @IsNotEmpty()
  company: Company;
} 