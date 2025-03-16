import { Injectable } from '@nestjs/common';
import { TicketPriority } from '../tickets/enums/ticket-priority.enum';
import OpenAI from 'openai';

export interface TriageResult {
  priority: TicketPriority;
  summary: string;
  suggestedAreaId: number;
}

interface AIResponse {
  priority: TicketPriority;
  summary: string;
  suggestedAreaId: number;
  response: string;
}

@Injectable()
export class VeraAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  private async getAssistantResponse(messages: string[]): Promise<AIResponse> {
    const systemPrompt = `Você é a Vera, uma assistente virtual especializada em triagem de tickets de suporte.
    Sua função é analisar as mensagens dos clientes e:
    1. Determinar a prioridade do ticket (baixa, média ou alta)
    2. Criar um resumo conciso do problema
    3. Sugerir a área mais apropriada para atendimento
    4. Gerar uma resposta profissional e acolhedora

    Regras para prioridade:
    - ALTA: Problemas urgentes que afetam operações críticas ou causam perdas financeiras
    - MÉDIA: Problemas que impactam o trabalho mas têm alternativas temporárias
    - BAIXA: Dúvidas gerais, solicitações de informação ou problemas menores

    Áreas disponíveis:
    1: Administrativa (questões gerais, financeiro, contratos)
    2: Suporte Técnico (problemas técnicos, configurações)
    3: Comercial (vendas, propostas, parcerias)

    Responda no formato JSON:
    {
      "priority": "low|medium|high",
      "summary": "resumo conciso do problema",
      "suggestedAreaId": número da área,
      "response": "sua resposta ao cliente"
    }`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messages.join("\n") }
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('OpenAI returned empty response');
      
      return JSON.parse(content) as AIResponse;
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      return this.getFallbackResponse(messages);
    }
  }

  private getFallbackResponse(messages: string[]): AIResponse {
    // Resposta de fallback caso a OpenAI falhe
    return {
      priority: TicketPriority.MEDIUM,
      summary: messages[messages.length - 1].substring(0, 100),
      suggestedAreaId: 1,
      response: `Olá! Sou a Vera, assistente virtual. Entendi sua mensagem e estou direcionando você para a melhor equipe. 
      Por favor, aguarde um momento enquanto um de nossos atendentes assume a conversa.`
    };
  }

  async performTriage(messages: string[]): Promise<TriageResult> {
    const result = await this.getAssistantResponse(messages);
    
    return {
      priority: result.priority,
      summary: result.summary,
      suggestedAreaId: result.suggestedAreaId
    };
  }

  async generateResponse(message: string): Promise<string> {
    const result = await this.getAssistantResponse([message]);
    return result.response;
  }
} 