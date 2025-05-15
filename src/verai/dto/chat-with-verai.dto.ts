import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ChatWithVerAiDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
} 