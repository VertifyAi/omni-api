import { IsString, IsOptional, IsNumber } from 'class-validator';

export class GetAnalyticsDto {
  @IsNumber()
  @IsOptional()
  startDate: string = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  @IsString()
  @IsOptional()
  endDate: string = new Date().toISOString();

  @IsNumber()
  @IsOptional()
  teamId?: number;

  @IsNumber()
  @IsOptional()
  userId?: number;
}
