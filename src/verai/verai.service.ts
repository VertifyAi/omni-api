/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { ChatWithVerAiDto } from './dto/chat-with-verai.dto';
import { graph } from './graph';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VeraiService {
  private conversations = new Map<string, Record<string, unknown>>();

  async chat(chatDto: ChatWithVerAiDto) {
    console.log('chatDto', chatDto);
    const conversationId = chatDto.conversationId ? String(chatDto.conversationId) : uuidv4();
    const previousState = this.conversations.get(conversationId) as any;

    // vamos construir o objeto stateInput explicitamente
    // preservando as propriedades importantes
    const stateInput: any = {
      // Preservar mensagens do histórico + nova mensagem
      messages: [
        ...((previousState?.messages as any[]) || []),
        {
          role: 'user',
          content: chatDto.message,
        },
      ],

      // Preservar queries
      queries: previousState?.queries || [],

      // Preservar departamento responsável
      responsibleDepartment: previousState?.responsibleDepartment || null,

      // Preservar informações do usuário (CRÍTICO)
      userInfo: {
        ...(previousState?.userInfo || {
          name: null,
          email: null,
          onboardingCompleted: false,
        }),
      },

      // Definir o conversationStep (menos importante agora, pois a lógica é baseada nas mensagens)
      conversationStep: previousState?.conversationStep || 'initialization',
    };

    // const config: any = {
    //   configurable: {
    //     userId: user?.id ? String(user.id) : 'default',
    //     companyName: user?.companyId ? String(user.companyId) : 'default',
    //   },
    // };

    const newState = await graph.invoke(stateInput);

    // Garantir que as informações críticas do usuário sejam preservadas
    const mergedUserInfo = {
      name: newState.userInfo?.name || previousState?.userInfo?.name || null,
      email: newState.userInfo?.email || previousState?.userInfo?.email || null,
      onboardingCompleted:
        newState.userInfo?.onboardingCompleted ||
        previousState?.userInfo?.onboardingCompleted ||
        false,
    };

    // Deduplica mensagens pelo id
    const dedupMessages = (() => {
      const seen = new Set<string>();
      const result: any[] = [];
      for (const msg of newState.messages as any[]) {
        const id = (msg as any).id ?? JSON.stringify(msg);
        if (!seen.has(id)) {
          seen.add(id);
          result.push(msg);
        }
      }
      return result;
    })();

    const mergedState = {
      messages: dedupMessages,
      queries: newState.queries || [],
      responsibleDepartment: newState.responsibleDepartment || null,
      userInfo: mergedUserInfo,
      conversationStep:
        newState.conversationStep ||
        previousState?.conversationStep ||
        'initialization',
    } as any;

    this.conversations.set(conversationId, mergedState);

    const assistantMessages = dedupMessages.filter(
      (m: any) => m.role === 'assistant',
    );

    let reply = null;
    if (assistantMessages.length > 0) {
      const lastAssistantMessage =
        assistantMessages[assistantMessages.length - 1];
      reply = lastAssistantMessage?.content || null;
    }

    return {
      conversationId,
      reply,
      state: mergedState,
    };
  }
}
