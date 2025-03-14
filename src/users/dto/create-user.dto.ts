import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsEnum, Matches } from 'class-validator';
import { CreateAddressDto } from '../../addresses/dto/create-address.dto';
import { CreateCompanyDto } from '../../companies/dto/create-company.dto';
import { UserRole } from '../user-role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome do usuário' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString({ message: 'O nome deve ser uma string' })
  firstName: string;

  @ApiProperty({ description: 'Sobrenome do usuário' })
  @IsNotEmpty({ message: 'O sobrenome é obrigatório' })
  @IsString({ message: 'O sobrenome deve ser uma string' })
  lastName: string;

  @ApiProperty({ description: 'Email do usuário' })
  @IsNotEmpty({ message: 'O email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ description: 'Senha do usuário' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @IsString({ message: 'A senha deve ser uma string' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/, {
    message: 'A senha deve conter pelo menos 6 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial',
  })
  password: string;

  @ApiProperty({ description: 'Confirmação de senha' })
  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória' })
  @IsString({ message: 'A confirmação de senha deve ser uma string' })
  passwordConfirmation: string;

  @ApiProperty({ description: 'Telefone do usuário (formato: (99) 99999-9999)', example: '(11) 99999-9999' })
  @IsNotEmpty({ message: 'O telefone é obrigatório' })
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, { message: 'Telefone inválido. Use o formato: (99) 99999-9999' })
  phone: string;

  @ApiProperty({ description: 'Endereço do usuário' })
  @IsNotEmpty({ message: 'O endereço é obrigatório' })
  address: CreateAddressDto;

  @ApiProperty({ description: 'Dados da empresa' })
  @IsNotEmpty({ message: 'Os dados da empresa são obrigatórios' })
  company: CreateCompanyDto;

  @ApiProperty({ description: 'Papel do usuário no sistema', enum: UserRole })
  @IsNotEmpty({ message: 'O papel do usuário é obrigatório' })
  @IsEnum(UserRole)
  role: UserRole = UserRole.ADMIN;
} 