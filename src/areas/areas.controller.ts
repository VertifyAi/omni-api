import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Area } from './entities/area.entity';
import { CompanyOwnerGuard } from '../users/guards/company-owner.guard';
import { AuthGuard } from '../auth/auth.guard';
import { Request } from 'express';
import { User } from '../auth/interfaces/user.interface';

@ApiTags('Áreas')
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @ApiOperation({ summary: 'Criar nova área na empresa' })
  @ApiResponse({ status: 201, description: 'Área criada com sucesso', type: Area })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar áreas nesta empresa' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, CompanyOwnerGuard)
  @Post('')
  create(
    @Req() req: Request & { user: User },
    @Body() createAreaDto: CreateAreaDto
  ) {
    return this.areasService.create(req.user.companyId, createAreaDto);
  }

  @ApiOperation({ summary: 'Listar todas as áreas da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de áreas obtida com sucesso', type: [Area] })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para listar áreas desta empresa' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, CompanyOwnerGuard)
  @Get('')
  findAllByCompany(@Req() req: Request & { user: User }) {
    return this.areasService.findByCompanyId(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(+id);
  }
}
