import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateIntegrationDto {
  @ApiProperty({ description: 'Número de telefone que receberá as mensagens do WhatsApp' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
} 