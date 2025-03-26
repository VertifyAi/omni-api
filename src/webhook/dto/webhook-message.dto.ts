import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookMessageTextDto {
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class WebhookMessageDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => WebhookMessageTextDto)
  text: WebhookMessageTextDto;
} 