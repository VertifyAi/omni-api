import { IsString, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
