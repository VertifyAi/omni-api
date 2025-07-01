import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FreshdeskIntegrationDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  api_key: string;

  @IsBoolean()
  @IsOptional()
  auto_responses?: boolean;

  @IsBoolean()
  @IsOptional()
  priority_analysis?: boolean;

  @IsBoolean()
  @IsOptional()
  business_hours_check?: boolean;

  @IsBoolean()
  @IsOptional()
  ai_integration?: boolean;

  @IsBoolean()
  @IsOptional()
  ticket_transfer?: boolean;

  @IsBoolean()
  @IsOptional()
  contact_sync?: boolean;

  @IsString()
  @IsOptional()
  phone?: string;
}
