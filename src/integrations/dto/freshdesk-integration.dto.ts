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
  priority_analysis?: boolean;

  @IsBoolean()
  @IsOptional()
  ticket_creation?: boolean;

  @IsBoolean()
  @IsOptional()
  ticket_close?: boolean;

  @IsBoolean()
  @IsOptional()
  contact_sync?: boolean;
}
