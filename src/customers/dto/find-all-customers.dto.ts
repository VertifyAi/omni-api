import { IsString, IsOptional } from 'class-validator';

export class FindAllCustomersDto {
  @IsString()
  @IsOptional()
  limit: string;

  @IsString()
  @IsOptional()
  page: string;

  @IsString()
  @IsOptional()
  search: string;
}
