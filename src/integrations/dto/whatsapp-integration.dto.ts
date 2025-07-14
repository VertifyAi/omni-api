import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WhatsappIntegrationDto {
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @IsString()
  @IsOptional()
  data_access_expiration_time?: string;

  @IsString()
  @IsNotEmpty()
  expires_in: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  waba_ids: string[];
}
