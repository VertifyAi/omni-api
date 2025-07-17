import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { CreateAgentDto, InteractionExampleDto } from './dto/create-agent.dto';
import { User } from 'src/users/entities/user.entity';
import { OpenAIService } from 'src/integrations/openai/openai.service';
import { TeamsService } from 'src/teams/teams.service';
import { InteractionExample } from './entities/interaction-example.entity';
import { TeamsToRedirect } from './entities/teams-to-redirect.entity';
import { FindAllAgentsDto } from './dto/find-all-agents.dto';
import { UploadFileDto } from './dto/upload-image.dto';
import { S3Service } from 'src/integrations/aws/s3.service';
import { AgentsllmKnowledgeBase } from './entities/agents-llm-knowledge-base.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(InteractionExample)
    private readonly interactionExampleRepository: Repository<InteractionExample>,
    @InjectRepository(TeamsToRedirect)
    private readonly teamsToRedirectRepository: Repository<TeamsToRedirect>,
    @InjectRepository(AgentsllmKnowledgeBase)
    private readonly agentsllmKnowledgeBase: Repository<AgentsllmKnowledgeBase>,
    private readonly llmService: OpenAIService,
    private readonly teamService: TeamsService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Encontra todos os agentes de uma empresa
   * @param companyId
   */
  async findAllAgents(
    companyId: number,
    findAllAgentsDto: FindAllAgentsDto,
  ): Promise<{ agents: Agent[]; total: number }> {
    const { limit, page, search } = findAllAgentsDto;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { companyId };

    if (search) {
      where['name'] = ILike(`%${search}%`);
    }

    const [agents, total] = await this.agentRepository.findAndCount({
      where,
      skip,
      take: Number(limit),
      order: {
        name: 'ASC',
      },
    });

    return {
      agents,
      total,
    };
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
    return await this.agentRepository.findOne({
      where: { id: Number(agentId), companyId: currentUser.companyId },
      relations: ['teamsToRedirect'],
    });
  }

  /**
   * Encontra um agente baseado no id
   * @param agentId
   * @param companyId
   */
  async findOneById(agentId: number, companyId?: number) {
    try {
      return await this.agentRepository.findOne({
        where: { id: agentId, companyId },
        relations: ['teamsToRedirect', 'llmKnowledgeBase'],
      });
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error searching for AI agent by ID',
      );
    }
  }

  /**
   * Faz o upload da imagem de perfil
   * @param agentId
   * @param file
   */
  async uploadImage(agentId: string, file: UploadFileDto) {
    const agent = await this.findOneById(Number(agentId));
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    try {
      const s3Url = await this.s3Service.uploadFile({
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      });

      return await this.agentRepository.update(agentId, {
        profilePicture: s3Url,
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Error uploading image');
    }
  }

  /**
   * Faz o upload da base de conhecimento
   * @param agentId
   * @param files
   */
  async uploadKnowledgeBase(agentId: string, files: UploadFileDto[]) {
    const agent = await this.findOneById(Number(agentId));
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    try {
      let vectorStore;
      if (agent.llmKnowledgeBase) {
        vectorStore = await this.findVectorStoreById(
          agent.llmKnowledgeBase[0].vectorStoreId,
        );
        this.llmService.deleteVectorStoreById(vectorStore.id);
        agent.llmKnowledgeBase.forEach(async (llmKnowledgeBase) => {
          await this.agentsllmKnowledgeBase.delete(llmKnowledgeBase);
        });
      }
      vectorStore = await this.createVectorStore(
        `knowledge_base_${agent.llmAssistantId}`,
      );
      files.forEach(async (file: UploadFileDto) => {
        const fileId = await this.llmService.uploadFile(file);
        await this.llmService.addFileToVectorStore(vectorStore.id, fileId);

        const fileUrl = await this.s3Service.uploadFile(
          file,
          'omni-knowledge-base',
        );

        const agentsllmKnowledgeBaseCreated =
          this.agentsllmKnowledgeBase.create({
            fileUrl,
            agentId: agent.id,
            vectorStoreId: vectorStore.id,
          });
        await this.agentsllmKnowledgeBase.save(agentsllmKnowledgeBaseCreated);
      });
      await this.llmService.attachVectorStoreToAssistant(
        agent.llmAssistantId,
        vectorStore,
      );
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Error uploading knowledge base',
      );
    }
  }

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

    const vectorStore = await this.createVectorStore(
      `teams_knowledge_base_${assistantId}`,
    );
    await this.attachJsonVectorStore(assistantId, teams, vectorStore);

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

    const vectorStore = await this.createVectorStore(
      `products_or_services_knowledge_base_${assistantId}`,
    );
    await this.attachJsonVectorStore(
      assistantId,
      createAgentDto.products_or_services_knowledge_base,
      vectorStore,
    );
  }

  /**
   * Vincula um json ao vector store do assistente
   * @param assistantId
   * @param json
   * @param vectorStore
   */
  private async attachJsonVectorStore(
    assistantId: string,
    json: Record<string, unknown> | unknown[],
    vectorStore: {
      id: string;
      object: string;
      created_at: number;
    },
  ): Promise<void> {
    await this.llmService.addJsonToVectorStore(vectorStore, json);
    await this.llmService.attachVectorStoreToAssistant(
      assistantId,
      vectorStore,
    );
  }

  /**
   * Cria um vector store
   * @param vectorStoreName
   */
  private async createVectorStore(vectorStoreName: string) {
    return await this.llmService.createVectorStore(vectorStoreName);
  }

  /**
   * Busca um vector store por id
   * @param vectorStoreId
   */
  private async findVectorStoreById(vectorStoreId: string) {
    return await this.llmService.findVectorStoreById(vectorStoreId);
  }
}
