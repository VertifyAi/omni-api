import { IsEnum, IsOptional } from 'class-validator';
import { TwilioIntegrationStatus } from '../entities/twilio-integration.entity';

export class UpdateTwilioIntegrationDto {
  @IsEnum(TwilioIntegrationStatus)
  @IsOptional()
  status?: TwilioIntegrationStatus;
} 