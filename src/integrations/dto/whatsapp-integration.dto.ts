import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsappIntegrationDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsString()
  @IsNotEmpty()
  waba_id: string;
}
