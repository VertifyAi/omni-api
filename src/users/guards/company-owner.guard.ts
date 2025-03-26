import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../user-role.enum';

@Injectable()
export class CompanyOwnerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem criar usuários');
    }

    return true;
  }
} 