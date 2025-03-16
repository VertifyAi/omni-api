import { Controller, Get, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@ApiTags('Me')
@Controller('me')
@ApiBearerAuth()
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário', type: User })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getMe(@Request() req) {
    // Garante que o ID do usuário é um número válido
    const userId = Number(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('ID de usuário inválido');
    }

    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    const { password, ...result } = user;
    return result;
  }
} 