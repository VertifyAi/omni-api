import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @IsNumber()
  @IsNotEmpty()
  companyId: number;

  @IsNumber()
  @IsOptional()
  monthlyAttendanceLimit?: number; // Para plano empresarial
} 