import { IsNotEmpty, IsString } from 'class-validator';
import { Address } from 'src/addresses/entities/address.entity';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  cnpj: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  address: Address;
} 