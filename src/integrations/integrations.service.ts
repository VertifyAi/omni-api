import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from './entities/integration.entity';
import { CompaniesService } from '../companies/companies.service';
import { TwilioService } from '../twilio/twilio.service';
import { ConfigService } from '@nestjs/config';
import { IntegrationType } from './entities/integration.entity';

@Injectable()
export class IntegrationsService {
  private readonly META_AUTH_URL = 'https://www.facebook.com/v20.0/dialog/oauth';

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly companiesService: CompaniesService,
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService,
  ) {}


  async saveWhatsAppIntegration(
    companyId: number,
    accessToken: string,
    phoneNumberId: string,
    wabaId: string
  ) {
    const integration = await this.integrationRepository.findOne({
      where: { company_id: companyId, type: IntegrationType.WHATSAPP_META },
    });

    if (integration) {
      integration.config = { accessToken, phoneNumberId, wabaId };
      await this.integrationRepository.save(integration);
      return { message: 'Integração atualizada com sucesso!' };
    } else {
      const newIntegration = this.integrationRepository.create({
        company_id: companyId,
        type: IntegrationType.WHATSAPP_META,
        name: 'WhatsApp Business API',
        config: { accessToken, phoneNumberId, wabaId },
        active: true,
      });

      await this.integrationRepository.save(newIntegration);
      return { message: 'Integração criada com sucesso!' };
    }
  }

  getMetaAuthUrl(companyId: number): string {
    const clientId = this.configService.get<string>('META_APP_ID');
    const redirectUri = this.configService.get<string>('META_REDIRECT_URI');
    const scope = 'whatsapp_business_management,whatsapp_business_messaging';

    return `${this.META_AUTH_URL}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${companyId}&response_type=code`;
  }
} 