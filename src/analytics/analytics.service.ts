/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { TicketsService } from 'src/tickets/tickets.service';
import { TeamsService } from 'src/teams/teams.service';
import { User, UserRole } from 'src/users/entities/user.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { TicketStatus } from 'src/tickets/entities/ticket.entity';
import { UsersService } from 'src/users/users.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly teamsService: TeamsService,
    private readonly usersService: UsersService,
  ) {}

  async getAnalytics(getAnalyticsDto: GetAnalyticsDto, user: User) {
    // Validar acesso baseado na role do usuário
    await this.validateAccess(getAnalyticsDto, user);

    // Buscar os tickets baseado nas permissões
    const tickets = await this.getTicketsBasedOnRole(getAnalyticsDto, user);

    // Verificar se tickets foi retornado corretamente
    if (!tickets) {
      throw new InternalServerErrorException('Erro ao buscar tickets');
    }

    // Pegar a satisfação geral dos tickets
    const startDate = getAnalyticsDto.startDate
      ? new Date(getAnalyticsDto.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const endDate = getAnalyticsDto.endDate
      ? new Date(getAnalyticsDto.endDate)
      : new Date(Date.now());

    const totalScore = await this.ticketsService.calculateSatisfactionScore(
      user.companyId,
      startDate,
      endDate,
      getAnalyticsDto.teamId,
    );

    const averageHumanResolutionTime =
      await this.ticketsService.calculateAverageHumanResolutionTime(
        user.companyId,
        startDate,
        endDate,
        getAnalyticsDto.teamId,
      );

    const averageHumanResolutionTimePreviousPeriod =
      await this.ticketsService.calculateAverageHumanResolutionTime(
        user.companyId,
        new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        getAnalyticsDto.teamId,
      );

    const rankingUsersByScore = await this.usersService.getRankingUsersByScore(
      user.companyId,
      startDate,
      endDate,
      getAnalyticsDto.teamId,
    );

    return {
      totalTickets: {
        total: tickets.tickets.length,
        previousPeriod: tickets.previousPeriodTickets.length,
        percentage:
          tickets.previousPeriodTickets.length > 0
            ? (tickets.tickets.length / tickets.previousPeriodTickets.length) *
              100
            : 0,
      },
      resolutionWithAI: {
        totalPercentage: this.calculateAIResolutionPercentage(tickets.tickets),
        previousPeriodPercentage: this.calculateAIResolutionPercentage(
          tickets.previousPeriodTickets,
        ),
      },
      averageHumanResolutionTime: {
        total: averageHumanResolutionTime,
        previousPeriod: averageHumanResolutionTimePreviousPeriod,
        difference:
          averageHumanResolutionTime - averageHumanResolutionTimePreviousPeriod,
      },
      totalScore,
      quantityOfTicketByChannel: Object.entries(
        tickets.tickets.reduce((acc, ticket) => {
          acc[ticket.channel] = (acc[ticket.channel] || 0) + 1;
          return acc;
        }, {}),
      ).map(([channel, quantity]) => ({
        channel,
        quantity,
      })),
      quantityOfTicketByTeams: Object.entries(
        tickets.tickets.reduce((acc, ticket) => {
          const areaName = ticket.area?.name || 'Outros';
          acc[areaName] = (acc[areaName] || 0) + 1;
          return acc;
        }, {}),
      ).map(([areaName, quantity]) => ({
        areaName,
        quantity,
      })),
      scoreAverageByMonth: await this.generateLast12MonthsScores(user, getAnalyticsDto.teamId),
      rankingUsersByScore,
      tickets,
    };
  }

  async exportPdf(
    user: User,
    getAnalyticsDto: GetAnalyticsDto,
  ): Promise<Buffer> {
    // Buscar dados do analytics
    const analyticsData = await this.getAnalytics(getAnalyticsDto, user);

    // Criar documento PDF
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });

    // Buffer para armazenar o PDF
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Definir datas do período
    const startDate = getAnalyticsDto.startDate
      ? new Date(getAnalyticsDto.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = getAnalyticsDto.endDate
      ? new Date(getAnalyticsDto.endDate)
      : new Date();

    // Cabeçalho
    this.addHeader(doc, startDate, endDate, user.company?.name || 'Empresa');

    // Métricas principais
    this.addMainMetrics(doc, analyticsData);

    // Gráfico de satisfação por mês
    this.addSatisfactionChart(doc, analyticsData.scoreAverageByMonth);

    // Distribuição por canal
    this.addChannelDistribution(doc, analyticsData.quantityOfTicketByChannel);

    // Distribuição por equipes
    this.addTeamDistribution(doc, analyticsData.quantityOfTicketByTeams);

    // Ranking de usuários
    this.addUserRanking(doc, analyticsData.rankingUsersByScore);

    // Rodapé
    this.addFooter(doc);

    // Finalizar documento
    doc.end();

    // Aguardar conclusão e retornar buffer
    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }

  private async validateAccess(getAnalyticsDto: GetAnalyticsDto, user: User) {
    switch (user.role) {
      case UserRole.ADMIN:
        // ADMINISTRADOR: pode acessar tudo da empresa
        break;

      case "MANAGER":
        // GESTOR: pode acessar métricas da equipe que gerencia
        if (getAnalyticsDto.teamId) {
          const team = await this.teamsService.findOne(
            parseInt(getAnalyticsDto.teamId),
          );
          if (team.ownerId !== user.id) {
            throw new ForbiddenException(
              'Você só pode acessar métricas das equipes que você gerencia',
            );
          }
        } else {
          throw new ForbiddenException(
            'Você só pode acessar métricas das equipes que você gerencia',
          );
        }
        break;

      // case UserRole.USER:
      //   // USUÁRIO COMUM: só pode acessar suas próprias métricas
      //   if (getAnalyticsDto.teamId) {
      //     throw new ForbiddenException(
      //       'Usuários comuns não podem filtrar por equipe',
      //     );
      //   }

      //   if (getAnalyticsDto.userId && getAnalyticsDto.userId !== user.id) {
      //     throw new ForbiddenException(
      //       'Você só pode acessar suas próprias métricas',
      //     );
      //   }
      //   break;

      default:
        throw new ForbiddenException('Role de usuário não reconhecida');
    }
  }

  private async generateLast12MonthsScores(user: User, teamId: string | undefined) {
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    // Calcular os últimos 12 meses
    const currentDate = new Date();
    const startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 11,
      1,
    );
    const endDate = new Date();

    // Buscar tickets dos últimos 12 meses baseado na role do usuário
    const analyticsDto = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId,
    } as GetAnalyticsDto;

    const ticketsData = await this.getTicketsBasedOnRole(analyticsDto, user, true);
    
    // Verificar se ticketsData foi retornado corretamente
    if (!ticketsData) {
      throw new InternalServerErrorException('Erro ao buscar tickets para gerar scores');
    }
    
    const tickets = ticketsData.tickets;

    // Gerar os últimos 12 meses
    const last12Months: Array<{
      month: string;
      monthIndex: number;
      year: number;
      score: number | null;
      count: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const monthName = monthNames[monthDate.getMonth()];
      const year = monthDate.getFullYear();
      const monthKey = `${monthName} ${year}`;

      last12Months.push({
        month: monthKey,
        monthIndex: monthDate.getMonth(),
        year: year,
        score: null,
        count: 0,
      });
    }

    // Filtrar tickets com score e processar por mês/ano
    const ticketsWithScore = tickets.filter(
      (ticket) => ticket.score !== null && ticket.score !== undefined,
    );

    const scoresByMonth = ticketsWithScore.reduce(
      (acc, ticket) => {
        const ticketDate = new Date(ticket.createdAt);
        const monthName = monthNames[ticketDate.getMonth()];
        const year = ticketDate.getFullYear();
        const monthKey = `${monthName} ${year}`;

        if (!acc[monthKey]) {
          acc[monthKey] = { totalScore: 0, count: 0 };
        }

        acc[monthKey].totalScore += Math.max(0, Math.min(5, ticket.score || 0));
        acc[monthKey].count += 1;
        return acc;
      },
      {} as Record<string, { totalScore: number; count: number }>,
    );

    // Preencher os últimos 12 meses com dados ou valores padrão
    return last12Months.map((monthData) => ({
      month: monthData.month,
      score: scoresByMonth[monthData.month]
        ? parseFloat(
            (
              scoresByMonth[monthData.month].totalScore /
              scoresByMonth[monthData.month].count
            ).toFixed(2),
          )
        : 0,
      count: scoresByMonth[monthData.month]?.count || 0,
    }));
  }

  private async getTicketsBasedOnRole(
    getAnalyticsDto: GetAnalyticsDto,
    user: User,
    closeTicket: boolean = false,
  ) {
    switch (user.role) {
      case UserRole.ADMIN:
        // ADMINISTRADOR: acesso total
        if (getAnalyticsDto.teamId) {
          // Filtrar por equipe específica
          return await this.ticketsService.getTicketsAnalytics(
            getAnalyticsDto,
            user.companyId,
            closeTicket,
          );
        } else {
          // Todos os tickets da empresa
          return await this.ticketsService.getTicketsAnalytics(
            getAnalyticsDto,
            user.companyId,
            closeTicket,
          );
        }

      case UserRole.MANAGER:
        return await this.ticketsService.getTicketsAnalytics(
          getAnalyticsDto,
          user.companyId,
          closeTicket,
        );

      default:
        throw new ForbiddenException('Role de usuário não reconhecida');
    }
  }

  private addHeader(
    doc: PDFKit.PDFDocument,
    startDate: Date,
    endDate: Date,
    companyName: string,
  ) {
    // Título principal
    doc
      .fontSize(24)
      .fillColor('#2c3e50')
      .text('Relatório de Analytics', 50, 50);

    // Subtítulo com período
    doc
      .fontSize(14)
      .fillColor('#7f8c8d')
      .text(
        `Período: ${this.formatDate(startDate)} a ${this.formatDate(endDate)}`,
        50,
        80,
      );

    // Nome da empresa
    doc
      .fontSize(12)
      .fillColor('#34495e')
      .text(`Empresa: ${companyName}`, 50, 100);

    // Linha separadora
    doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#bdc3c7').stroke();

    return 150; // Retorna posição Y para próxima seção
  }

  private addMainMetrics(doc: PDFKit.PDFDocument, data: any) {
    let yPosition = 150;

    // Título da seção
    doc
      .fontSize(18)
      .fillColor('#2c3e50')
      .text('Métricas Principais', 50, yPosition);

    yPosition += 40;

    // Métricas em colunas
    const metrics = [
      {
        title: 'Total de Tickets',
        value: data.totalTickets.total.toString(),
        change: this.formatPercentage(data.totalTickets.percentage),
        color: '#3498db',
      },
      {
        title: 'Resolução com IA',
        value: this.formatPercentage(data.resolutionWithAI.totalPercentage),
        change: this.formatPercentageDifference(
          data.resolutionWithAI.totalPercentage,
          data.resolutionWithAI.previousPeriodPercentage,
        ),
        color: '#e74c3c',
      },
      {
        title: 'Satisfação Média',
        value: this.formatScore(data.totalScore.averageScore),
        change: this.formatPercentage(data.totalScore.satisfactionPercentage),
        color: '#2ecc71',
      },
      {
        title: 'Tempo Médio (h)',
        value: this.formatTime(data.averageHumanResolutionTime.total),
        change: this.formatTimeDifference(
          data.averageHumanResolutionTime.difference,
        ),
        color: '#f39c12',
      },
    ];

    metrics.forEach((metric, index) => {
      const xPosition = 50 + index * 130;

      // Caixa colorida
      doc
        .rect(xPosition, yPosition, 120, 80)
        .fillColor(metric.color)
        .fillOpacity(0.1)
        .fill();

      // Título da métrica
      doc
        .fontSize(10)
        .fillColor('#7f8c8d')
        .fillOpacity(1)
        .text(metric.title, xPosition + 10, yPosition + 10);

      // Valor principal
      doc
        .fontSize(20)
        .fillColor(metric.color)
        .text(metric.value, xPosition + 10, yPosition + 25);

      // Mudança
      doc
        .fontSize(12)
        .fillColor('#7f8c8d')
        .text(metric.change, xPosition + 10, yPosition + 50);
    });

    return yPosition + 100;
  }

  private addSatisfactionChart(doc: PDFKit.PDFDocument, scoreData: any[]) {
    let yPosition = 280;

    // Título da seção
    doc
      .fontSize(16)
      .fillColor('#2c3e50')
      .text('Satisfação por Mês', 50, yPosition);

    yPosition += 30;

    // Área do gráfico
    const chartX = 50;
    const chartY = yPosition;
    const chartWidth = 500;
    const chartHeight = 200;

    // Fundo do gráfico
    doc
      .rect(chartX, chartY, chartWidth, chartHeight)
      .fillColor('#f8f9fa')
      .fill();

    // Linhas de grade do gráfico

    // Desenhar linhas de grade
    for (let i = 0; i <= 5; i++) {
      const y = chartY + (i * chartHeight) / 5;
      doc
        .moveTo(chartX, y)
        .lineTo(chartX + chartWidth, y)
        .strokeColor('#e9ecef')
        .stroke();
    }

    // Desenhar linha do gráfico
    let previousX = chartX;
    let previousY =
      chartY + chartHeight - ((scoreData[0]?.score || 0) / 5) * chartHeight;

    scoreData.forEach((data, index) => {
      const x = chartX + index * (chartWidth / (scoreData.length - 1));
      const y = chartY + chartHeight - (data.score / 5) * chartHeight;

      if (index > 0) {
        doc
          .moveTo(previousX, previousY)
          .lineTo(x, y)
          .strokeColor('#3498db')
          .lineWidth(2)
          .stroke();
      }

      // Ponto
      doc.circle(x, y, 3).fillColor('#3498db').fill();

      // Label do mês (apenas os primeiros 6 para não sobrecarregar)
      if (index % 2 === 0) {
        doc
          .fontSize(8)
          .fillColor('#7f8c8d')
          .text(data.month.split(' ')[0], x - 15, chartY + chartHeight + 10);
      }

      previousX = x;
      previousY = y;
    });

    return yPosition + chartHeight + 40;
  }

  private addChannelDistribution(doc: PDFKit.PDFDocument, channelData: any[]) {
    let yPosition = 580;

    // Verificar se precisa de nova página
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    // Título da seção
    doc
      .fontSize(16)
      .fillColor('#2c3e50')
      .text('Distribuição por Canal', 50, yPosition);

    yPosition += 30;

    // Tabela de canais
    channelData.forEach((channel) => {
      const barWidth =
        (channel.quantity / Math.max(...channelData.map((c) => c.quantity))) *
        200;

      // Nome do canal
      doc
        .fontSize(12)
        .fillColor('#2c3e50')
        .text(channel.channel, 50, yPosition);

      // Barra
      doc.rect(200, yPosition, barWidth, 15).fillColor('#3498db').fill();

      // Quantidade
      doc
        .fontSize(10)
        .fillColor('#7f8c8d')
        .text(channel.quantity.toString(), 410, yPosition + 2);

      yPosition += 25;
    });

    return yPosition + 20;
  }

  private addTeamDistribution(doc: PDFKit.PDFDocument, teamData: any[]) {
    let yPosition = doc.y + 30;

    // Verificar se precisa de nova página
    if (yPosition > 650) {
      doc.addPage();
      yPosition = 50;
    }

    // Título da seção
    doc
      .fontSize(16)
      .fillColor('#2c3e50')
      .text('Distribuição por Equipe', 50, yPosition);

    yPosition += 30;

    // Tabela de equipes
    teamData.forEach((team) => {
      const barWidth =
        (team.quantity / Math.max(...teamData.map((t) => t.quantity))) * 200;

      // Nome da equipe
      doc.fontSize(12).fillColor('#2c3e50').text(team.areaName, 50, yPosition);

      // Barra
      doc.rect(200, yPosition, barWidth, 15).fillColor('#2ecc71').fill();

      // Quantidade
      doc
        .fontSize(10)
        .fillColor('#7f8c8d')
        .text(team.quantity.toString(), 410, yPosition + 2);

      yPosition += 25;
    });

    return yPosition + 20;
  }

  private addUserRanking(doc: PDFKit.PDFDocument, rankingData: any[]) {
    let yPosition = doc.y + 30;

    // Verificar se precisa de nova página
    if (yPosition > 600) {
      doc.addPage();
      yPosition = 50;
    }

    // Título da seção
    doc
      .fontSize(16)
      .fillColor('#2c3e50')
      .text('Ranking dos Usuários', 50, yPosition);

    yPosition += 30;

    // Cabeçalho da tabela
    doc
      .fontSize(12)
      .fillColor('#2c3e50')
      .text('Posição', 50, yPosition)
      .text('Nome', 120, yPosition)
      .text('Score Médio', 300, yPosition)
      .text('Tickets', 400, yPosition);

    yPosition += 20;

    // Linha separadora
    doc
      .moveTo(50, yPosition)
      .lineTo(500, yPosition)
      .strokeColor('#bdc3c7')
      .stroke();

    yPosition += 10;

    // Ranking
    rankingData.slice(0, 10).forEach((user, index) => {
      const position = index + 1;
      const positionText =
        position <= 3 ? ['1º', '2º', '3º'][position - 1] : `${position}º`;

      doc
        .fontSize(11)
        .fillColor(position <= 3 ? '#f39c12' : '#2c3e50')
        .text(positionText, 50, yPosition)
        .fillColor('#2c3e50')
        .text(user.name, 120, yPosition)
        .fillColor('#27ae60')
        .text(user.averageScore.toFixed(2), 300, yPosition)
        .fillColor('#7f8c8d')
        .text(user.totalTickets.toString(), 400, yPosition);

      yPosition += 18;
    });

    return yPosition + 20;
  }

  private addFooter(doc: PDFKit.PDFDocument) {
    // Adicionar rodapé apenas na página atual
    const currentY = doc.y;

    // Verificar se há espaço suficiente na página atual
    if (currentY > 720) {
      doc.addPage();
    }

    // Posicionar o rodapé no final da página
    doc.y = 750;

    // Linha separadora
    doc.moveTo(50, 750).lineTo(550, 750).strokeColor('#bdc3c7').stroke();

    // Texto do rodapé
    doc
      .fontSize(10)
      .fillColor('#7f8c8d')
      .text(`Relatório gerado em ${this.formatDate(new Date())}`, 50, 760)
      .text('Página 1 de 1', 450, 760);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatPercentage(value: number): string {
    if (value === null || value === undefined || !isFinite(value)) {
      return '0%';
    }
    return `${value.toFixed(1)}%`;
  }

  private formatPercentageDifference(
    current: number,
    previous: number,
  ): string {
    if (!isFinite(current) || !isFinite(previous) || previous === 0) {
      return '0%';
    }
    const diff = current - previous;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  }

  private formatScore(value: number): string {
    if (value === null || value === undefined || !isFinite(value)) {
      return '0.0';
    }
    return value.toFixed(1);
  }

  private formatTime(milliseconds: number): string {
    if (
      !isFinite(milliseconds) ||
      milliseconds === null ||
      milliseconds === undefined
    ) {
      return '0.0';
    }
    const hours = milliseconds / (1000 * 60 * 60);
    return hours.toFixed(1);
  }

  private formatTimeDifference(milliseconds: number): string {
    if (
      !isFinite(milliseconds) ||
      milliseconds === null ||
      milliseconds === undefined
    ) {
      return '0.0h';
    }
    const hours = milliseconds / (1000 * 60 * 60);
    const sign = hours > 0 ? '+' : '';
    return `${sign}${hours.toFixed(1)}h`;
  }

  private calculateAIResolutionPercentage(tickets: any[]): number {
    const closedTickets = tickets.filter(
      (ticket) => ticket.status === TicketStatus.CLOSED,
    );

    if (closedTickets.length === 0) {
      return 0;
    }

    const aiClosedTickets = closedTickets.filter((ticket) => ticket.agentId);

    return (aiClosedTickets.length / closedTickets.length) * 100;
  }
}
