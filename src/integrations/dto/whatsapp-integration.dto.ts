import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsappIntegrationDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsString()
  @IsNotEmpty()
  data_access_expiration_time: string

  @IsString()
  @IsNotEmpty()
  expires_in: string;
}
