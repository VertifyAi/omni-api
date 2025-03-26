import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Company } from './entities/company.entity';
import { AuthGuard } from '../auth/auth.guard';
import { Request } from 'express';
import { User } from '../auth/interfaces/user.interface';

@ApiTags('Empresas')
@Controller('companies')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({ summary: 'Criar nova empresa' })
  @ApiResponse({ status: 201, description: 'Empresa criada com sucesso', type: Company })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @Post()
  create(
    @Req() req: Request & { user: User },
    @Body() createCompanyDto: CreateCompanyDto
  ) {
    return this.companiesService.create(createCompanyDto, req.user.id);
  }
}
