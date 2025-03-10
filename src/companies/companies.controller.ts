import { Body, Controller, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Company } from './entities/company.entity';

@ApiTags('Empresas')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({ summary: 'Criar nova empresa' })
  @ApiResponse({ status: 201, description: 'Empresa criada com sucesso', type: Company })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }
}
