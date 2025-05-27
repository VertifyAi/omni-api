import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  role: UserRole

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
  areaId: number;
}
