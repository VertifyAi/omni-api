import { IsNotEmpty, IsString } from 'class-validator';
import { Address } from 'src/addresses/entities/address.entity';
import { UserRole } from 'src/users/user-role.enum';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  address: Address;

  @IsNotEmpty()
  areaId: number;

  @IsNotEmpty()
  role: UserRole;
}
