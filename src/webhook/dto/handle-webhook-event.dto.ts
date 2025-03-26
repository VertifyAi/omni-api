import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEntryDto } from './webhook-entry.dto';

export class HandleWebhookEventDto {
  @IsString()
  @IsNotEmpty()
  object: string;

  @ValidateNested({ each: true })
  @Type(() => WebhookEntryDto)
  entry: WebhookEntryDto[];
}
