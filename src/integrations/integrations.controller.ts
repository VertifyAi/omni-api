import {
  Controller,
  Post,
  Request,
  UseGuards,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';
import { IntegrationType } from './entities/integration.entity';
import { FreshdeskIntegrationDto } from './dto/freshdesk-integration.dto';

@UseGuards(AuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('whatsapp')
  async whatsappIntegration(
    @Request() req,
    @Body() whatsappIntegrationDto: WhatsappIntegrationDto,
  ) {
    return await this.integrationsService.whatsappIntegration(
      req.user,
      whatsappIntegrationDto,
    );
  }

  @Post('freshdesk')
  async freshdeskIntegration(
    @Request() req,
    @Body() freshdeskIntegrationDto: FreshdeskIntegrationDto,
  ) {
    return await this.integrationsService.freshdeskIntegration(
      req.user,
      freshdeskIntegrationDto,
    );
  }

  @Get()
  async getIntegrations(@Request() req) {
    return await this.integrationsService.findAllIntegrations(req.user);
  }

  @Get('whatsapp/phone-numbers')
  async getWhatsappPhoneNumbers(@Request() req) {
    return await this.integrationsService.getWhatsappPhoneNumbers(req.user);
  }

  @Post(':type/desactivate')
  async desactivateIntegration(
    @Request() req,
    @Param('type') type: IntegrationType,
  ) {
    return await this.integrationsService.desactivateIntegration(
      req.user,
      type,
    );
  }
}
