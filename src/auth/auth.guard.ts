import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtPayload {
  email: string;
  sub: number;
  role: string;
  areaId: number;
  companyId: number;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        token,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
        }
      );

      // Verifica se o token está expirado
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Token expirado');
      }

      // Verifica se todos os campos necessários estão presentes
      if (!payload.email || !payload.sub || !payload.role) {
        throw new UnauthorizedException('Token inválido');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        areaId: payload.areaId,
        companyId: payload.companyId
      };
    } catch (error) {
      throw new UnauthorizedException(
        error.message || 'Token inválido'
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    
    if (!type || !token) {
      throw new UnauthorizedException('Header de autorização ausente ou mal formatado');
    }

    if (type.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Tipo de token inválido. Use Bearer');
    }

    return token;
  }
}
