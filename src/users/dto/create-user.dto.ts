import { IsString, IsNotEmpty, IsEmail, IsNumber, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  role: UserRole

  @IsString()
  @IsNotEmpty()
  street_name: string

  @IsString()
  @IsNotEmpty()
  street_number: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsString()
  @IsNotEmpty()
  state: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsNumber()
  @IsOptional()
  areaId: number;
}
