import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateAgentDto } from './dto/create-agent.dto';
import { FindAllAgentsDto } from './dto/find-all-agents.dto';
import { UploadFileDto } from './dto/upload-image.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async findAll(@Request() req, @Query() findAllAgentsDto: FindAllAgentsDto) {
    return await this.agentsService.findAllAgents(
      req.user.companyId,
      findAllAgentsDto,
    );
  }

  @Post()
  async create(@Request() req, @Body() createAgentDto: CreateAgentDto) {
    return await this.agentsService.createAgent(createAgentDto, req.user);
  }

  @Get('/:agentId')
  async findOneById(@Request() req, @Param('agentId') agentId: string) {
    return await this.agentsService.findOneAgentById(agentId, req.user.id);
  }

  @Post(':agentId/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('agentId') agentId: string,
    @UploadedFile() file: UploadFileDto,
  ) {
    return this.agentsService.uploadImage(agentId, file);
  }

  @Post(':agentId/upload-knowledge-base')
  @UseInterceptors(FileInterceptor('image'))
  uploadKnowledgeBase(
    @Param('agentId') agentId: string,
    @UploadedFile() files: UploadFileDto[],
  ) {
    return this.agentsService.uploadKnowledgeBase(agentId, files);
  }
}
