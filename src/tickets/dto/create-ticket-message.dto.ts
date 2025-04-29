import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsNumber()
  @IsNotEmpty()
  ticketId: number;
}
