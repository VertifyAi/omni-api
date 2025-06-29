import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto, InteractionExampleDto } from './dto/create-agent.dto';
import { User } from 'src/users/entities/user.entity';
import { OpenAIService } from 'src/integrations/openai/openai.service';
import { TeamsService } from 'src/teams/teams.service';
import { InteractionExample } from './entities/interaction-example.entity';
import { TeamsToRedirect } from './entities/teams-to-redirect.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(InteractionExample)
    private readonly interactionExampleRepository: Repository<InteractionExample>,
    @InjectRepository(TeamsToRedirect)
    private readonly teamsToRedirectRepository: Repository<TeamsToRedirect>,
    private readonly llmService: OpenAIService,
    private readonly teamService: TeamsService,
  ) {}

  /**
   * Encontra todos os agentes de uma empresa
   * @param companyId
   */
  async findAllAgents(companyId: number) {
    return await this.agentRepository.findBy({
      companyId,
    });
  }

  /**
   * Cria um agente
   * @param createAgentDto
   * @param currentUser
   */
  async createAgent(createAgentDto: CreateAgentDto, currentUser: User) {
    const assistant = await this.llmService.createAssistant(createAgentDto);

    await this.setupAgentConfiguration(
      createAgentDto,
      assistant.id,
      currentUser,
    );

    const agent = await this.agentRepository.save({
      name: createAgentDto.name,
      tone: createAgentDto.tone,
      objective: createAgentDto.objective,
      segment: createAgentDto.segment,
      description: createAgentDto.description,
      llmAssistantId: assistant.id,
      companyId: currentUser.companyId,
    });

    if (createAgentDto.interaction_example) {
      await this.interactionExampleRepository.save(
        createAgentDto.interaction_example.map(
          (example: InteractionExampleDto) => ({
            agentId: agent.id,
            question: example.question,
            answer: example.answer,
            reasoning: example.reasoning,
          }),
        ),
      );
    }

    if (createAgentDto.teams_to_redirect) {
      await this.teamsToRedirectRepository.save(
        createAgentDto.teams_to_redirect.map((teamId: number) => ({
          agentId: agent.id,
          teamId: teamId,
        })),
      );
    }

    return assistant;
  }

  /**
   * Encontra um agente baseado no id
   * @param agentId
   * @param currentUser
   */
  async findOneAgentById(agentId: string, currentUser: User) {
    return await this.agentRepository.findOneBy({
      companyId: currentUser.companyId,
      id: Number(agentId),
    });
  }

  /**
   * Encontra um agente baseado no id
   * @param agentId
   * @param companyId
   */
  async findOneById(agentId: number, companyId: number) {
    return await this.agentRepository.findOneBy({ id: agentId, companyId });
  }

  // /**
  //  * Encontra um agente baseado no número de whatsapp
  //  * @param whatsappNumber
  //  * @param companyId
  //  */
  // async findOneAgentByWhatsappNumber(
  //   whatsappNumber: string,
  //   companyId: number,
  // ) {
  //   return await this.agentRepository.findOneBy({
  //     whatsappNumber,
  //     companyId,
  //   });
  // }

  /**
   * Configura o agente baseado no seu objetivo
   * @param createAgentDto
   * @param assistantId
   * @param currentUser
   */
  private async setupAgentConfiguration(
    createAgentDto: CreateAgentDto,
    assistantId: string,
    currentUser: User,
  ): Promise<void> {
    const { objective } = createAgentDto;

    switch (objective) {
      case 'screening':
        await this.setupScreeningAgent(
          createAgentDto,
          assistantId,
          currentUser,
        );
        break;
      case 'sales':
        await this.setupSalesAgent(createAgentDto, assistantId);
        break;
      default:
        // Nenhuma configuração adicional necessária
        break;
    }
  }

  /**
   * Configura um agente de triagem
   * @param createAgentDto
   * @param assistantId
   * @param currentUser
   */
  private async setupScreeningAgent(
    createAgentDto: CreateAgentDto,
    assistantId: string,
    currentUser: User,
  ): Promise<void> {
    if (!createAgentDto.teams_to_redirect) {
      return;
    }

    const teams = await this.teamService.findByIds(
      createAgentDto.teams_to_redirect,
      currentUser.companyId,
    );

    await this.createAndAttachVectorStore(
      assistantId,
      teams,
      `teams_knowledge_base_${assistantId}`,
    );

    const assistantFunction = await this.llmService.createFunction(
      createAgentDto,
      teams,
    );
    await this.llmService.attachFunctionToAssistant(
      assistantId,
      assistantFunction,
    );
  }

  /**
   * Configura um agente de vendas
   * @param createAgentDto
   * @param assistantId
   */
  private async setupSalesAgent(
    createAgentDto: CreateAgentDto,
    assistantId: string,
  ): Promise<void> {
    if (!createAgentDto.products_or_services_knowledge_base) {
      return;
    }

    await this.createAndAttachVectorStore(
      assistantId,
      createAgentDto.products_or_services_knowledge_base,
      `products_or_services_knowledge_base_${assistantId}`,
    );
  }

  /**
   * Cria um vector store e o vincula ao assistente
   * @param assistantId
   * @param data
   * @param vectorStoreName
   */
  private async createAndAttachVectorStore(
    assistantId: string,
    data: Record<string, unknown> | unknown[],
    vectorStoreName: string,
  ): Promise<void> {
    const vectorStore = await this.llmService.createVectorStore(
      assistantId,
      vectorStoreName,
    );
    await this.llmService.addJsonToVectorStore(vectorStore, data);
    await this.llmService.attachVectorStoreToAssistant(
      assistantId,
      vectorStore,
    );
  }
}
