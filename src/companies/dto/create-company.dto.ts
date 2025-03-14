import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { CreateAddressDto } from '../../addresses/dto/create-address.dto';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString({ message: 'O nome deve ser uma string' })
  name: string;

  @ApiProperty({ description: 'CNPJ (formato: 99.999.999/9999-99)', example: '12.345.678/0001-90' })
  @IsNotEmpty({ message: 'O CNPJ é obrigatório' })
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: 'CNPJ inválido. Use o formato: 99.999.999/9999-99' })
  cnpj: string;

  @ApiProperty({ description: 'Telefone (formato: (99) 99999-9999)', example: '(11) 99999-9999' })
  @IsNotEmpty({ message: 'O telefone é obrigatório' })
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, { message: 'Telefone inválido. Use o formato: (99) 99999-9999' })
  phone: string;

  @ApiProperty({ description: 'Endereço da empresa' })
  @IsNotEmpty({ message: 'O endereço é obrigatório' })
  address: CreateAddressDto;
} 