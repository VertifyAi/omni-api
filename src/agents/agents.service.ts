import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  async findAllAgents(companyId: number) {
    return await this.agentRepository.findBy({
      companyId,
    });
  }

  async createAgent(createAgentDto: CreateAgentDto, currentUser: User) {
    const agent = this.agentRepository.create({
      ...createAgentDto,
      companyId: currentUser.companyId,
    });
    await this.agentRepository.save(agent);
    return agent;
  }

  async findOneAgentById(agentId: string, currentUser: User) {
    return await this.agentRepository.findOneBy({
      companyId: currentUser.companyId,
      id: Number(agentId),
    });
  }

  async findOneAgentByWhatsappNumber(whatsappNumber: string, companyId: number) {
    return await this.agentRepository.findOneBy({
      whatsappNumber,
      companyId,
    })
  }
}
