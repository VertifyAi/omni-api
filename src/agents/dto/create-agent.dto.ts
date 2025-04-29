import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsNotEmpty()
  whatsappNumber: string;

  @IsString()
  @IsNotEmpty()
  systemMessage: string;
}
