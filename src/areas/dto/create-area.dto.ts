import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAreaDto {
  @ApiProperty({ description: 'Nome da área' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição da área' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ 
    description: 'Lista de IDs dos usuários que participarão da equipe',
    type: [Number]
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  users: number[];
} 