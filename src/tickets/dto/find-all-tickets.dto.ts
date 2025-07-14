import { IsString, IsOptional } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class FindAllTicketsDto {
  @IsString()
  @IsOptional()
  limit: string;

  @IsString()
  @IsOptional()
  page: string;

  @IsString()
  @IsOptional()
  search: string;

  @IsString()
  @IsOptional()
  status: TicketStatus;
}
