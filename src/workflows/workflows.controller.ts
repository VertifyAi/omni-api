import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req) {
    return this.workflowsService.create(createWorkflowDto, req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.workflowsService.findOne(Number(id), req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.workflowsService.findAll(req.user.companyId);
  }
}
