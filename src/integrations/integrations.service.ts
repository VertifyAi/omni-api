import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { User } from 'src/users/entities/user.entity';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';
import { HttpService } from '@nestjs/axios';
// import { lastValueFrom } from 'rxjs';

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
      config: JSON.stringify(whatsappIntegrationDto),
    });
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

    const config = JSON.parse(integration.config);
    console.log('config', config);

    // await lastValueFrom(
    //   this.httpService.post(
    //     `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    //     whatsappPayload,
    //     {
    //       headers: {
    //         Authorization: `Bearer ${process.env.META_ACESS_TOKEN}`,
    //         'Content-Type': 'application/json',
    //       },
    //     },
    //   ),
    // );
  }
}
