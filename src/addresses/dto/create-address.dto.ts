import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: 'Rua/Logradouro' })
  @IsNotEmpty({ message: 'A rua é obrigatória' })
  @IsString({ message: 'A rua deve ser uma string' })
  street: string;

  @ApiProperty({ description: 'Cidade' })
  @IsNotEmpty({ message: 'A cidade é obrigatória' })
  @IsString({ message: 'A cidade deve ser uma string' })
  city: string;

  @ApiProperty({ description: 'Estado (2 caracteres)', example: 'SP' })
  @IsNotEmpty({ message: 'O estado é obrigatório' })
  @IsString({ message: 'O estado deve ser uma string' })
  @Length(2, 2, { message: 'O estado deve ter exatamente 2 caracteres' })
  state: string;

  @ApiProperty({ description: 'CEP (formato: 99999-999)', example: '12345-678' })
  @IsNotEmpty({ message: 'O CEP é obrigatório' })
  @Matches(/^\d{5}-\d{3}$/, { message: 'CEP inválido. Use o formato: 99999-999' })
  zip_code: string;

  @ApiProperty({ description: 'País' })
  @IsNotEmpty({ message: 'O país é obrigatório' })
  @IsString({ message: 'O país deve ser uma string' })
  country: string;

  @ApiProperty({ description: 'Complemento (opcional)' })
  @IsOptional()
  @IsString({ message: 'O complemento deve ser uma string' })
  complement?: string;
} 