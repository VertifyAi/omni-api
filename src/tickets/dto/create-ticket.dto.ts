import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
