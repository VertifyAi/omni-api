import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GetAnalyticsDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}
