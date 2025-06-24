import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested, IsOptional, IsBoolean } from 'class-validator';

class WebhookMetadataDto {
  @IsString()
  display_phone_number: string;

  @IsString()
  phone_number_id: string;
}

class WebhookContactProfileDto {
  @IsString()
  name: string;
}

class WebhookContactDto {
  @ValidateNested()
  @Type(() => WebhookContactProfileDto)
  profile: WebhookContactProfileDto;

  @IsString()
  wa_id: string;
}

class WebhookMessageTextDto {
  @IsString()
  body: string;
}

class WebhookMessageAudioDto {
  @IsString()
  mime_type: string;

  @IsString()
  sha256: string;

  @IsString()
  id: string;

  @IsBoolean()
  @IsOptional()
  voice?: boolean;
}

class WebhookMessageDto {
  @IsString()
  from: string;

  @IsString()
  id: string;

  @IsString()
  timestamp: string;

  @ValidateNested()
  @Type(() => WebhookMessageTextDto)
  @IsOptional()
  text?: WebhookMessageTextDto;

  @ValidateNested()
  @Type(() => WebhookMessageAudioDto)
  @IsOptional()
  audio?: WebhookMessageAudioDto;

  @IsString()
  type: string;
}

class WebhookValueDto {
  @IsString()
  messaging_product: string;

  @ValidateNested()
  @Type(() => WebhookMetadataDto)
  metadata: WebhookMetadataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookContactDto)
  contacts: WebhookContactDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookMessageDto)
  messages: WebhookMessageDto[];
}

class WebhookChangeDto {
  @ValidateNested()
  @Type(() => WebhookValueDto)
  value: WebhookValueDto;

  @IsString()
  field: string;
}

class WebhookEntryDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookChangeDto)
  changes: WebhookChangeDto[];
}

export class WhatsappWebhookDto {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntryDto)
  entry: WebhookEntryDto[];
}
