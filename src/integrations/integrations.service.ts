import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { User } from 'src/users/entities/user.entity';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly httpService: HttpService,
  ) {}

  async whatsappIntegration(
    currentUser: User,
    whatsappIntegrationDto: WhatsappIntegrationDto,
  ): Promise<Integration> {
    console.log('whatsappIntegrationDto', whatsappIntegrationDto);
    let integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type: IntegrationType.WHATSAPP,
    });

    if (integration) {
      throw new Error('Integration already exists');
    }

    integration = this.integrationRepository.create({
      companyId: currentUser.companyId,
      type: IntegrationType.WHATSAPP,
      active: true,
      config: whatsappIntegrationDto,
    });
    console.log('integration', integration);
    await this.integrationRepository.save(integration);
    return integration;
  }

  async findAllIntegrations(currentUser: User): Promise<Integration[]> {
    return await this.integrationRepository.find({
      where: { companyId: currentUser.companyId, active: true },
    });
  }

  async getWhatsappPhoneNumbers(currentUser: User) {
    const integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type: IntegrationType.WHATSAPP,
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const response = [] as unknown[];

    const { data } = await lastValueFrom(
      this.httpService.get(
        `https://graph.facebook.com/v22.0/me?fields=businesses&access_token=${integration.config.access_token}`,
      ),
    );

    for (const business of data.businesses.data) {
      const { data: wabaData } = await lastValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/v22.0/${business.id}/owned_whatsapp_business_accounts?access_token=${integration.config.access_token}`,
        ),
      );

      for (const account of wabaData.data) {
        const { data: phoneData } = await lastValueFrom(
          this.httpService.get(
            `https://graph.facebook.com/v22.0/${account.id}?fields=phone_numbers&access_token=${integration.config.access_token}`,
          ),
        );

        if (phoneData.phone_numbers) {
          for (const phone of phoneData.phone_numbers.data) {
            response.push(phone);
          }
        }
      }
    }

    return response;
  }

  async findByIds(ids: number[], companyId: number) {
    return await this.integrationRepository.findBy({ id: In(ids), companyId });
  }

  async desactivateIntegration(currentUser: User, type: IntegrationType) {
    const integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type,
      active: true,
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.active = false;
    await this.integrationRepository.save(integration);
    return integration;
  }
}
