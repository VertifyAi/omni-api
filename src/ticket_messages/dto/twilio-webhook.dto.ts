import { ApiProperty } from '@nestjs/swagger';

export class TwilioWebhookDto {
  @ApiProperty()
  Body: string;

  @ApiProperty()
  From: string;

  @ApiProperty()
  To: string;

  @ApiProperty()
  MessageSid: string;
} 