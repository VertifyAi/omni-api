import { IsNotEmpty, IsJSON } from 'class-validator';

export class WhatsappIntegrationDto {
  @IsJSON()
  @IsNotEmpty()
  config: string;
}
