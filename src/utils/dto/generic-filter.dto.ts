import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenericFilterDto {
  @Transform(({ value }) => toNumber(value, { default: 1, min: 1 }))
  @IsNumber({}, { message: ' "page" atrribute should be a number' })
  page: number;

  @Transform(({ value }) => toNumber(value, { default: 10, min: 1 }))
  @IsNumber({}, { message: ' "pageSize" attribute should be a number ' })
  pageSize: number;

  @IsString()
  @IsOptional()
  search: string;
}

function toNumber(value: string, options: { default: number; min: number }) {
  if (value === undefined || value === null) {
    return options.default;
  }
  const num = Number(value);
  return Number.isNaN(num) ? options.default : Math.max(options.min, num);
}
