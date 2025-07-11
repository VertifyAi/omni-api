import { IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { TicketPriorityLevel } from '../entities/ticket.entity';

export class TransferTicketDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsEnum(TicketPriorityLevel)
  @IsOptional()
  priorityLevel?: TicketPriorityLevel;

  @IsNumber()
  @IsOptional()
  teamId?: number;

  @IsNumber()
  @IsOptional()
  agentId?: number;

  @IsBoolean()
  @IsOptional()
  closeTicket?: boolean;
}
