import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookMessageDto } from './webhook-message.dto';

export class WebhookChangeValueDto {
  @ValidateNested({ each: true })
  @Type(() => WebhookMessageDto)
  messages: WebhookMessageDto[];
}

export class WebhookChangeDto {
  @ValidateNested()
  @Type(() => WebhookChangeValueDto)
  value: WebhookChangeValueDto;
} 