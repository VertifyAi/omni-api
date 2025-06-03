import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class ChangeTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  status: TicketStatus;

  @IsString()
  @IsOptional()
  userId: string;

  @IsNumber()
  @IsOptional()
  companyId: number;
}
