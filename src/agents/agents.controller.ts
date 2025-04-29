import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateAgentDto } from './dto/create-agent.dto';

@UseGuards(AuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async findAll(@Request() req) {
    return await this.agentsService.findAllAgents(req.user.companyId);
  }

  @Post()
  async create(@Request() req, @Body() createAgentDto: CreateAgentDto) {
    return await this.agentsService.createAgent(createAgentDto, req.user);
  }

  @Get('/:agentId')
  async findOneById(@Request() req, @Param('agentId') agentId: string) {
    return await this.agentsService.findOneAgentById(agentId, req.user.id);
  }
}
