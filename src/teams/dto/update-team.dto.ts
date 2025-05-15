import { IsString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  ownerId: number;

  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  members: number[];
}
