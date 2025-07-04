import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { User } from 'src/users/entities/user.entity';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { FreshdeskIntegrationDto } from './dto/freshdesk-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Integração com o WhatsApp
   * @param currentUser - Usuário logado
   * @param whatsappIntegrationDto - Dados da integração
   * @returns Integração criada
   */
  async whatsappIntegration(
    currentUser: User,
    whatsappIntegrationDto: WhatsappIntegrationDto,
  ): Promise<Integration> {
    let integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type: IntegrationType.WHATSAPP,
    });

    if (integration && integration.active) {
      return integration;
    } else if (integration && !integration.active) {
      integration.active = true;
      integration.config = whatsappIntegrationDto;
    } else {
      integration = this.integrationRepository.create({
        companyId: currentUser.companyId,
        type: IntegrationType.WHATSAPP,
        active: true,
        config: whatsappIntegrationDto,
      });
    }

    try {
      await this.integrationRepository.save(integration);
    } catch (error) {
      throw new Error(error);
    }

    return integration;
  }

  /**
   * Busca todas as integrações ativas
   * @param currentUser - Usuário logado
   * @returns Integrações ativas
   */
  async findAllIntegrations(currentUser: User): Promise<Integration[]> {
    return await this.integrationRepository.find({
      where: { companyId: currentUser.companyId, active: true },
    });
  }

  /**
   * Busca todos os números de WhatsApp associados à integração
   * @param currentUser - Usuário logado
   * @returns Números de WhatsApp
   */
  async getWhatsappPhoneNumbers(currentUser: User) {
    console.log('getWhatsappPhoneNumbers');
    const integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type: IntegrationType.WHATSAPP,
    });

    console.log('integration', integration);

    if (!integration) {
      throw new Error('Integration not found');
    }

    const response = [] as unknown[];
    const whatsappConfig = integration.config as WhatsappIntegrationDto;

    const { data } = await lastValueFrom(
      this.httpService.get(
        `https://graph.facebook.com/v22.0/me?fields=businesses&access_token=${whatsappConfig.access_token}`,
      ),
    );

    console.log('data', data);

    for (const business of data.businesses.data) {
      const { data: wabaData } = await lastValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/v22.0/${business.id}/owned_whatsapp_business_accounts?access_token=${whatsappConfig.access_token}`,
        ),
      );

      console.log('wabaData', wabaData);

      for (const account of wabaData.data) {
        const { data: phoneData } = await lastValueFrom(
          this.httpService.get(
            `https://graph.facebook.com/v22.0/${account.id}?fields=phone_numbers&access_token=${whatsappConfig.access_token}`,
          ),
        );

        console.log('phoneData', phoneData);

        if (phoneData.phone_numbers) {
          for (const phone of phoneData.phone_numbers.data) {
            response.push(phone);
          }
        }
      }
    }

    return response;
  }

  /**
   * Busca todas as integrações pelos IDs
   * @param ids - IDs das integrações
   * @param companyId - ID da empresa
   * @returns Integrações encontradas
   */
  async findByIds(ids: number[], companyId: number) {
    return await this.integrationRepository.findBy({ id: In(ids), companyId });
  }

  /**
   * Desativa uma integração
   * @param currentUser - Usuário logado
   * @param type - Tipo de integração
   * @returns Integração desativada
   */
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

    try {
      const whatsappConfig = integration.config as WhatsappIntegrationDto;
      for (const wabaId of whatsappConfig.waba_ids) {
        await lastValueFrom(
          this.httpService.delete(
            `https://graph.facebook.com/v23.0/${wabaId}/subscribed_apps`,
            {
              headers: {
                Authorization: `Bearer ${whatsappConfig.access_token}`,
              },
            },
          ),
        );
      }
    } catch (error) {
      console.error(error);
    }

    await this.integrationRepository.save(integration);
    return integration;
  }

  /**
   * Integração com o Freshdesk
   * @param currentUser - Usuário logado
   * @param freshdeskIntegrationDto - Dados da integração
   * @returns Integração criada
   */
  async freshdeskIntegration(
    currentUser: User,
    freshdeskIntegrationDto: FreshdeskIntegrationDto,
  ) {
    let integration = await this.integrationRepository.findOneBy({
      companyId: currentUser.companyId,
      type: IntegrationType.FRESHDESK,
    });

    if (integration && integration.active) {
      return integration;
    } else if (integration && !integration.active) {
      integration.active = true;
      integration.config = freshdeskIntegrationDto;
    } else {
      integration = this.integrationRepository.create({
        type: IntegrationType.FRESHDESK,
        companyId: currentUser.companyId,
        active: true,
        config: freshdeskIntegrationDto,
      });
    }

    try {
      await this.integrationRepository.save(integration);
    } catch (error) {
      throw new Error(error);
    }

    return integration;
  }

  /**
   * Busca integração ativa por empresa e tipo
   * @param companyId - ID da empresa
   * @param type - Tipo de integração
   * @returns Integração ativa
   */
  async findActiveIntegrationByCompanyIdAndType(
    companyId: number,
    type: IntegrationType,
  ): Promise<Integration | null> {
    return await this.integrationRepository.findOneBy({
      companyId,
      type,
      active: true,
    });
  }

  /**
   * Verifica se uma integração específica está ativa para uma empresa
   * @param companyId - ID da empresa
   * @param type - Tipo de integração
   * @returns true se a integração estiver ativa
   */
  async isIntegrationActive(
    companyId: number,
    type: IntegrationType,
  ): Promise<boolean> {
    const integration = await this.integrationRepository.findOneBy({
      companyId,
      type,
      active: true,
    });

    return !!integration;
  }
}
