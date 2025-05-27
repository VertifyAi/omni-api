import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsEmail()
  @IsOptional() 
  email: string

  @IsString()
  @IsOptional()
  street_name: string

  @IsString()
  @IsOptional()
  street_number: string

  @IsString()
  @IsOptional()
  city: string

  @IsString()
  @IsOptional()
  state: string

  @IsString()
  @IsOptional()
  phone: string

  @IsNumber()
  @IsOptional()
  companyId?: number
}
