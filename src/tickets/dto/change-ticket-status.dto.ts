import { IsString, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class ChangeTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  status: TicketStatus;
}
