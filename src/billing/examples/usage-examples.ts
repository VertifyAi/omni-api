// Exemplos de como usar o sistema de billing nos seus controllers

import { Controller, Post, Body, Request } from '@nestjs/common';
import { CheckUsageLimit, RequireActiveSubscription } from '../decorators/check-usage-limit.decorator';
import { FeatureType } from '../entities/usage-tracking.entity';
import { UsageService } from '../services/usage.service';

// EXEMPLO 1: Controller de Canais
@Controller('channels')
export class ChannelsController {
  constructor(private readonly usageService: UsageService) {}

  // Verificar limite antes de criar canal
  @CheckUsageLimit(FeatureType.CHANNELS)
  @Post()
  async createChannel(@Body() channelData: any, @Request() req) {
    // Criar canal
    const channel = await this.createChannelLogic(channelData);
    
    // Incrementar uso após criar com sucesso
    await this.usageService.incrementUsage(req.user.companyId, FeatureType.CHANNELS);
    
    return channel;
  }

  // Decrementar quando deletar
  @RequireActiveSubscription()
  @Post('delete')
  async deleteChannel(@Body() { channelId }: any, @Request() req) {
    // Deletar canal
    await this.deleteChannelLogic(channelId);
    
    // Decrementar uso
    await this.usageService.decrementUsage(req.user.companyId, FeatureType.CHANNELS);
    
    return { message: 'Canal deletado com sucesso' };
  }

  private async createChannelLogic(data: any) {
    // Sua lógica de criação
    return {};
  }

  private async deleteChannelLogic(id: string) {
    // Sua lógica de deleção
  }
}

// EXEMPLO 2: Controller de Agentes IA
@Controller('ai-agents')
export class AIAgentsController {
  constructor(private readonly usageService: UsageService) {}

  @CheckUsageLimit(FeatureType.AI_AGENTS)
  @Post()
  async createAgent(@Body() agentData: any, @Request() req) {
    const agent = await this.createAgentLogic(agentData);
    await this.usageService.incrementUsage(req.user.companyId, FeatureType.AI_AGENTS);
    return agent;
  }

  private async createAgentLogic(data: any) {
    return {};
  }
}

// EXEMPLO 3: Controller de Atendimentos
@Controller('attendances')
export class AttendancesController {
  constructor(private readonly usageService: UsageService) {}

  @CheckUsageLimit(FeatureType.MONTHLY_ATTENDANCES)
  @Post()
  async createAttendance(@Body() attendanceData: any, @Request() req) {
    const attendance = await this.createAttendanceLogic(attendanceData);
    await this.usageService.incrementUsage(req.user.companyId, FeatureType.MONTHLY_ATTENDANCES);
    return attendance;
  }

  private async createAttendanceLogic(data: any) {
    return {};
  }
}

// EXEMPLO 4: Endpoint que apenas precisa de assinatura ativa
@Controller('dashboard')
export class DashboardController {
  @RequireActiveSubscription()
  @Post('analytics')
  async getAnalytics(@Request() req) {
    // Este endpoint só funciona se tiver assinatura ativa
    return { analytics: 'dados importantes' };
  }
} 