import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateAITicketMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @IsNotEmpty()
  ticketId: number;

  @IsString()
  @IsNotEmpty()
  senderIdentifier: string;
}
