import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class FindAllUsersDto {
  @IsEnum(UserRole)
  @IsString()
  @IsOptional()
  role: UserRole;
}