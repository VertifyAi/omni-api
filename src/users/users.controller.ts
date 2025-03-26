import { Body, Controller, Post, Get, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { CompanyOwnerGuard } from './guards/company-owner.guard';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiOperation({ summary: 'Criar novo usuário' })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: User })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 409, description: 'Email já está em uso' })
    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @ApiOperation({ summary: 'Criar novo usuário na empresa' })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: User })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Sem permissão para criar usuários nesta empresa' })
    @ApiBearerAuth()
    @UseGuards(AuthGuard, CompanyOwnerGuard)
    @Post('companies/:companyId/users')
    createCompanyUser(
        @Param('companyId') companyId: string,
        @Body() createUserDto: CreateCompanyUserDto
    ) {
        return this.usersService.createCompanyUser(parseInt(companyId), createUserDto);
    }

    @ApiOperation({ summary: 'Listar todos os usuários da empresa' })
    @ApiResponse({ status: 200, description: 'Lista de usuários obtida com sucesso', type: [User] })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    @ApiResponse({ status: 403, description: 'Sem permissão para listar usuários desta empresa' })
    @ApiBearerAuth()
    @UseGuards(AuthGuard, CompanyOwnerGuard)
    @Get('companies/:companyId')
    findAllByCompany(@Param('companyId') companyId: string) {
        return this.usersService.findAllByCompany(parseInt(companyId));
    }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
