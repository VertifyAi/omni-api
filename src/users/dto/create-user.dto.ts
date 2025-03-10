import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';
import { Address } from 'src/addresses/entities/address.entity';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  address: Address;

  @IsNotEmpty()
  areaId: number;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
} 