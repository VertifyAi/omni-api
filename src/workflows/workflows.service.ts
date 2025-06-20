import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowsChannels } from './entities/workflows-channels.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UsersService } from 'src/users/users.service';
import { AgentsService } from 'src/agents/agents.service';
import { TeamsService } from 'src/teams/teams.service';
import { IntegrationsService } from 'src/integrations/integrations.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowsChannels)
    private readonly workflowsChannelsRepository: Repository<WorkflowsChannels>,
    private readonly userService: UsersService,
    private readonly agentService: AgentsService,
    private readonly teamService: TeamsService,
    private readonly integrationService: IntegrationsService,
  ) {}

  async findOneWorkflowByChannelIdentifier(channelIdentifier: string) {
    return await this.workflowRepository.findOne({
      where: {
        workflowChannels: {
          channelIdentifier,
        },
      },
      relations: [
        'workflowChannels',
        'workflowUser',
        'workflowAgent',
        'workflowTeam',
      ],
    });
  }

  async create(createWorkflowDto: CreateWorkflowDto, companyId: number) {
    const workflow = this.workflowRepository.create({
      ...createWorkflowDto,
      flowData: JSON.parse(createWorkflowDto.flowData),
    });

    if (createWorkflowDto.workflowUserId) {
      const user = await this.userService.findOneById(
        createWorkflowDto.workflowUserId,
        companyId,
      );
      if (user) {
        workflow.workflowUser = user;
      }
    }

    if (createWorkflowDto.workflowAgentId) {
      const agent = await this.agentService.findOneById(
        createWorkflowDto.workflowAgentId,
        companyId,
      );
      if (agent) {
        workflow.workflowAgent = agent;
      }
    }

    if (createWorkflowDto.workflowTeamId) {
      const team = await this.teamService.findOneById(
        createWorkflowDto.workflowTeamId,
        companyId,
      );
      if (team) {
        workflow.workflowTeam = team;
      }
    }

    const channels = await this.integrationService.findByIds(
      createWorkflowDto.workflowChannels.map((channel) => channel.channelId),
      companyId,
    );

    // Primeiro salva o workflow para obter o ID
    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Depois cria e salva os channels com o workflow_id correto
    const workflowChannels = channels.map((channel) => {
      const channelData = createWorkflowDto.workflowChannels.find(
        (c) => c.channelId === channel.id,
      );
      return this.workflowsChannelsRepository.create({
        channelIdentifier: channelData?.channelIdentifier,
        integrationId: channel.id,
        workflowId: savedWorkflow.id, // Define o workflow_id corretamente
      });
    });

    console.log('workflow.workflowChannels', workflowChannels);

    await this.workflowsChannelsRepository.save(workflowChannels);

    // Associa os channels salvos ao workflow
    savedWorkflow.workflowChannels = workflowChannels;

    console.log('savedWorkflow', savedWorkflow);

    return savedWorkflow;
  }

  async findOne(id: number, companyId: number) {
    return await this.workflowRepository.findOne({
      where: { id, companyId },
      relations: [
        'workflowChannels',
        'workflowUser',
        'workflowAgent',
        'workflowTeam',
      ],
    });
  }

  async findAll(companyId: number) {
    return await this.workflowRepository.find({
      where: { companyId },
      relations: [
        'workflowChannels',
        'workflowUser',
        'workflowAgent',
        'workflowTeam',
      ],
    });
  }
}
