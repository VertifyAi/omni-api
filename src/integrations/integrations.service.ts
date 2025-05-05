import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { User } from 'src/users/entities/user.entity';
import { WhatsappIntegrationDto } from './dto/whatsapp-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
  ) {}

  async whatsappIntegration(
    currentUser: User,
    whatsappIntegrationDto: WhatsappIntegrationDto,
  ): Promise<Integration> {
    const { config } = whatsappIntegrationDto;
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
      config,
    });
    await this.integrationRepository.save(integration);
    return integration;
  }
}
