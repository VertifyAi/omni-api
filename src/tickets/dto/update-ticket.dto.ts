import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  message: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsNumber()
  @IsOptional()
  freshdeskTicketId: number;
}
