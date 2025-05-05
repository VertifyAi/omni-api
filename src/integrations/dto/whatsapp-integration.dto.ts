import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class WhatsappIntegrationDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsNumber()
  @IsNotEmpty()
  data_access_expiration_time: number

  @IsNumber()
  @IsNotEmpty()
  expires_in: number;
}
