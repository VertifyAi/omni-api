import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { AuthGuard } from './auth.guard';
import { SignUpDto } from './dto/sign-up.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @ApiOperation({ summary: 'Obter perfil do usuário' })
  @ApiResponse({ status: 200, description: 'Perfil obtido com sucesso', type: User })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @ApiOperation({ summary: 'Criar nova conta' })
  @ApiResponse({ status: 201, description: 'Conta criada com sucesso', type: User })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  @Post('sign-up')
  signUp(@Body() signInDto: SignUpDto) {
    return this.authService.signUp(signInDto);
  }
}
