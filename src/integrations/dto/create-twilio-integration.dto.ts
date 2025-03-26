import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTwilioIntegrationDto {
  @IsString()
  @IsNotEmpty()
  whatsapp_number: string;
} 