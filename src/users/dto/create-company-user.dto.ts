import { IsString, IsEmail, IsNotEmpty, IsEnum, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user-role.enum';

export class CreateCompanyUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 8 caracteres, deve conter letra maiúscula, minúscula e número)',
    example: 'Senha123@',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Senha muito fraca. Deve conter maiúsculas, minúsculas e números',
  })
  password: string;

  @ApiProperty({
    description: 'Função do usuário na empresa',
    enum: [UserRole.USER, UserRole.SUPERVISOR],
    example: UserRole.USER,
  })
  @IsEnum([UserRole.USER, UserRole.SUPERVISOR])
  @IsNotEmpty()
  role: UserRole;
} 