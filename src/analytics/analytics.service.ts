import { Injectable, ForbiddenException } from '@nestjs/common';
import { TicketsService } from 'src/tickets/tickets.service';
import { TeamsService } from 'src/teams/teams.service';
import { User, UserRole } from 'src/users/entities/user.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly teamsService: TeamsService,
  ) {}

  async getAnalytics(getAnalyticsDto: GetAnalyticsDto, user: User) {
    // Validar acesso baseado na role do usuário
    await this.validateAccess(getAnalyticsDto, user);

    // Buscar os tickets baseado nas permissões
    const tickets = await this.getTicketsBasedOnRole(getAnalyticsDto, user);

    // Aqui você pode processar os tickets para gerar as métricas
    // Por exemplo: calcular totais, médias, distribuições, etc.
    return {
      tickets,
      totalTickets: tickets.length,
      // Adicione outras métricas conforme necessário
    };
  }

  private async validateAccess(getAnalyticsDto: GetAnalyticsDto, user: User) {
    switch (user.role) {
      case UserRole.ADMIN:
        // ADMINISTRADOR: pode acessar tudo da empresa
        break;

      case UserRole.MANAGER:
        // GESTOR: pode acessar suas métricas e da equipe que gerencia
        if (getAnalyticsDto.teamId) {
          const team = await this.teamsService.findOne(getAnalyticsDto.teamId);
          if (team.ownerId !== user.id) {
            throw new ForbiddenException(
              'Você só pode acessar métricas da equipe que você gerencia',
            );
          }
        }

        if (getAnalyticsDto.userId && getAnalyticsDto.userId !== user.id) {
          // Verificar se o usuário solicitado faz parte da equipe gerenciada
          const managedTeams = await this.teamsService.findAll(user.companyId);
          const userManagedTeams = managedTeams.filter(
            (team) => team.ownerId === user.id,
          );

          let hasAccess = false;
          for (const team of userManagedTeams) {
            const teamMembers = team.members?.map((member) => member.id) || [];
            if (teamMembers.includes(getAnalyticsDto.userId)) {
              hasAccess = true;
              break;
            }
          }

          if (!hasAccess) {
            throw new ForbiddenException(
              'Você só pode acessar métricas de usuários da sua equipe',
            );
          }
        }
        break;

      case UserRole.USER:
        // USUÁRIO COMUM: só pode acessar suas próprias métricas
        if (getAnalyticsDto.teamId) {
          throw new ForbiddenException(
            'Usuários comuns não podem filtrar por equipe',
          );
        }

        if (getAnalyticsDto.userId && getAnalyticsDto.userId !== user.id) {
          throw new ForbiddenException(
            'Você só pode acessar suas próprias métricas',
          );
        }
        break;

      default:
        throw new ForbiddenException('Role de usuário não reconhecida');
    }
  }

  private async getTicketsBasedOnRole(
    getAnalyticsDto: GetAnalyticsDto,
    user: User,
  ) {
    switch (user.role) {
      case UserRole.ADMIN:
        // ADMINISTRADOR: acesso total
        if (getAnalyticsDto.userId) {
          // Filtrar por usuário específico
          return await this.ticketsService.getTicketsAnalytics(
            { ...getAnalyticsDto, userId: getAnalyticsDto.userId },
            user.companyId,
          );
        } else if (getAnalyticsDto.teamId) {
          // Filtrar por equipe específica
          return await this.ticketsService.getTicketsAnalytics(
            getAnalyticsDto,
            user.companyId,
          );
        } else {
          // Todos os tickets da empresa
          return await this.ticketsService.getTicketsAnalytics(
            getAnalyticsDto,
            user.companyId,
          );
        }

      case UserRole.MANAGER:
        if (getAnalyticsDto.userId) {
          // Métricas de usuário específico (já validado)
          return await this.ticketsService.getTicketsAnalytics(
            { ...getAnalyticsDto, userId: getAnalyticsDto.userId },
            user.companyId,
          );
        } else if (getAnalyticsDto.teamId) {
          // Métricas da equipe (já validado)
          return await this.ticketsService.getTicketsAnalytics(
            getAnalyticsDto,
            user.companyId,
          );
        } else {
          // Métricas próprias do gestor
          return await this.ticketsService.getTicketsAnalytics(
            { ...getAnalyticsDto, userId: user.id },
            user.companyId,
          );
        }

      case UserRole.USER:
        // USUÁRIO COMUM: apenas suas próprias métricas
        return await this.ticketsService.getTicketsAnalytics(
          { ...getAnalyticsDto, userId: user.id },
          user.companyId,
        );

      default:
        throw new ForbiddenException('Role de usuário não reconhecida');
    }
  }
}
