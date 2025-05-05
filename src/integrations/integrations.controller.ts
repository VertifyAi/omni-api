import { Controller, Post, Request, UseGuards, Body } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @UseGuards(AuthGuard) 
  @Post('whatsapp')
  async slackIntegration(@Request() req, @Body() whatsappIntegrationDto: WhatsappIntegrationDto) {
    return await this.integrationsService.whatsappIntegration(req.user, whatsappIntegrationDto);
  }
}
