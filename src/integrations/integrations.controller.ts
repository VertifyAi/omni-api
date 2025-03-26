import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Body
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { User } from '../auth/interfaces/user.interface';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Integrações')
@Controller('integrations')
@UseGuards(AuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}


  @Post('whatsapp/save')
  async saveWhatsAppIntegration(
    @Req() req: { user: User },
    @Body() data: { accessToken: string; phoneNumberId: string; wabaId: string }
  ) {
    return this.integrationsService.saveWhatsAppIntegration(
      req.user.companyId,
      data.accessToken,
      data.phoneNumberId,
      data.wabaId
    );
  }

  @Get('meta/auth-url')
  getMetaAuthUrl(@Req() req: { user: User }) {
    return { url: this.integrationsService.getMetaAuthUrl(req.user.companyId) };
  }
}
