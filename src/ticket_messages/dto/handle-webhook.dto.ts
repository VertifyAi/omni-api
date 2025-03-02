 
import { IsNotEmpty, IsString } from 'class-validator';

export class HandleWebhookDto {
  @IsNotEmpty()
  @IsString()
  SmsMessageSid: string;

  @IsNotEmpty()
  @IsString()
  NumMedia: string;

  @IsNotEmpty()
  @IsString()
  ProfileName: string;

  @IsNotEmpty()
  @IsString()
  MessageType: string;

  @IsNotEmpty()
  @IsString()
  SmsSid: string;

  @IsNotEmpty()
  @IsString()
  WaId: string;

  @IsNotEmpty()
  @IsString()
  SmsStatus: string;

  @IsNotEmpty()
  @IsString()
  Body: string;

  @IsNotEmpty()
  @IsString()
  To: string;

  @IsNotEmpty()
  @IsString()
  NumSegments: string;

  @IsNotEmpty()
  @IsString()
  ReferralNumMedia: string;

  @IsNotEmpty()
  @IsString()
  MessageSid: string;

  @IsNotEmpty()
  @IsString()
  AccountSid: string;

  @IsNotEmpty()
  @IsString()
  From: string;

  @IsNotEmpty()
  @IsString()
  ApiVersion: string;
}
