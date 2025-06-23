import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { TicketPriorityLevel, TicketStatus } from '../entities/ticket.entity';

export class ChangeTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  status: TicketStatus;

  @IsNumber()
  @IsOptional()
  userId: number;

  @IsEnum(TicketPriorityLevel)
  @IsOptional()
  priorityLevel: TicketPriorityLevel;
}
