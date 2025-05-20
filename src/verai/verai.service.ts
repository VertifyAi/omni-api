/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { ChatWithVerAiDto } from './dto/chat-with-verai.dto';
import { User } from 'src/users/entities/user.entity';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { NodeInterrupt } from '@langchain/langgraph';
import { StateGraph } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

@Injectable()
export class VeraiService {
  private model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  });

  private StateAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    nextRepresentative: Annotation<string>(),
    userInfo: Annotation<Record<string, string | number | boolean>>(),
    onboardingCompleted: Annotation<boolean>(),
    currentOnboardingQuestion: Annotation<number>(),
    onboardingQuestions: Annotation<Array<{ question: string; field: string }>>(),
    teams: Annotation<Array<{ id: string; name: string; description: string }>>(),
    selectedTeam: Annotation<string>(),
    isNewConversation: Annotation<boolean>(),
  });

  private graph;

  constructor() {
    // Define os nós do grafo
    const builder = new StateGraph(this.StateAnnotation)
      .addNode('onboarding', this.onboarding)
      .addNode('initial_support', this.initialSupport)
      .addNode('team_router', this.teamRouter)
      .addNode('billing_support', this.billingSupport)
      .addNode('technical_support', this.technicalSupport)
      .addEdge('__start__', 'onboarding');

    // Adiciona edges condicionais
    this.graph = builder
      .addConditionalEdges(
        'onboarding',
        async (state: typeof this.StateAnnotation.State) => {
          if (state.onboardingCompleted) {
            return 'completed';
          } else {
            return 'in_progress';
          }
        },
        {
          completed: 'team_router',
          in_progress: '__end__',
        },
      )
      .addConditionalEdges(
        'team_router',
        async (state: typeof this.StateAnnotation.State) => {
          if (state.selectedTeam) {
            return state.selectedTeam;
          } else {
            return 'initial_routing';
          }
        },
        {
          initial_routing: 'initial_support',
          billing: 'billing_support',
          technical: 'technical_support',
        },
      )
      .addConditionalEdges(
        'initial_support',
        async (state: typeof this.StateAnnotation.State) => {
          if (state.nextRepresentative?.includes('FATURAMENTO')) {
            return 'billing';
          } else if (state.nextRepresentative?.includes('TÉCNICO')) {
            return 'technical';
          } else {
            return 'conversational';
          }
        },
        {
          billing: 'billing_support',
          technical: 'technical_support',
          conversational: '__end__',
        },
      )
      .addConditionalEdges(
        'billing_support',
        async (state: typeof this.StateAnnotation.State) => {
          if (state.nextRepresentative === 'REEMBOLSO') {
            return 'refund';
          } else {
            return 'respond';
          }
        },
      )
      .compile();

    console.log('Grafo compilado com sucesso!');
  }

  async chat(chatDto: ChatWithVerAiDto, user: User) {
    try {
      console.log('user', user);
      // Converte a mensagem do DTO para o formato esperado pelo LangChain
      const userMessage = new HumanMessage(chatDto.message);
      
      // Determina se é uma nova conversa
      const isNewConversation = !chatDto.conversationId || chatDto.conversationId === 'new_conversation';
      
      // Prepara as informações iniciais do estado
      const initialState: Record<string, any> = {
        messages: [userMessage],
        isNewConversation,
      };
      
      // Adiciona informações de onboarding se for uma nova conversa
      if (isNewConversation) {
        initialState.onboardingCompleted = false;
        initialState.currentOnboardingQuestion = 0;
        initialState.onboardingQuestions = chatDto.onboardingQuestions || [];
        initialState.userInfo = chatDto.userInfo || {};
      } else {
        initialState.onboardingCompleted = true;
      }
      
      // Adiciona a lista de times
      if (chatDto.teams && chatDto.teams.length > 0) {
        initialState.teams = chatDto.teams;
      }
      
      // Invoca o grafo com a mensagem do usuário e os parâmetros
      const response = await this.graph.invoke(initialState);

      return {
        message: response.messages.at(-1)?.content,
        conversationId: chatDto.conversationId || 'new_conversation',
        response,
      };
    } catch (error) {
      console.error('Erro ao processar chat:', error);
      if (error instanceof NodeInterrupt) {
        return {
          message: 'Precisamos de autorização humana para prosseguir.',
          needsHumanAuthorization: true,
        };
      }
      return {
        message:
          'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        error: error.message,
      };
    }
  }

  private onboarding = async (state: typeof this.StateAnnotation.State) => {
    // Se não tiver perguntas de onboarding ou já estiver completo, marcar como concluído
    if (!state.onboardingQuestions || state.onboardingQuestions.length === 0 || state.onboardingCompleted) {
      return { 
        onboardingCompleted: true 
      };
    }
    console.log('---- onboarding ----');
    
    // Se for uma nova mensagem do usuário e não for a primeira interação
    if (state.isNewConversation === false && state.currentOnboardingQuestion > 0) {
      // Pegar a última mensagem do usuário (resposta à pergunta anterior)
      const lastUserMessage = state.messages.at(-1);
      console.log('lastUserMessage', lastUserMessage);
      if (lastUserMessage?._getType() === 'human') {
        const currentQuestion = state.onboardingQuestions[state.currentOnboardingQuestion - 1];
        // Armazenar a resposta no campo apropriado
        const userInfo = { 
          ...state.userInfo, 
          [currentQuestion.field]: lastUserMessage.content 
        };
        
        // Verificar se chegamos ao fim do onboarding
        if (state.currentOnboardingQuestion >= state.onboardingQuestions.length) {
          const welcomeMessage = new AIMessage(
            `Obrigado por fornecer suas informações! Agora, por favor, descreva como posso ajudá-lo hoje.`
          );
          
          return {
            userInfo,
            onboardingCompleted: true,
            messages: [...state.messages, welcomeMessage],
          };
        }
        
        // Preparar próxima pergunta
        const nextQuestion = state.onboardingQuestions[state.currentOnboardingQuestion];
        const questionMessage = new AIMessage(nextQuestion.question);
        
        return {
          userInfo,
          currentOnboardingQuestion: state.currentOnboardingQuestion + 1,
          messages: [...state.messages, questionMessage],
        };
      }
    }
    
    // Se for a primeira interação, enviar a primeira pergunta
    if (state.currentOnboardingQuestion === 0) {
      const firstQuestion = state.onboardingQuestions[0];
      const questionMessage = new AIMessage(firstQuestion.question);
      
      return {
        currentOnboardingQuestion: 1,
        isNewConversation: false,
        messages: [...state.messages, questionMessage],
      };
    }

    return state;
  };

  private teamRouter = async (state: typeof this.StateAnnotation.State) => {
    // Se já tiver um time selecionado, apenas passa adiante
    if (state.selectedTeam) {
      return state;
    }
    
    // Se não tiver times definidos, vai para o fluxo padrão
    if (!state.teams || state.teams.length === 0) {
      return { selectedTeam: 'initial_routing' };
    }
    
    const SYSTEM_TEMPLATE = `Você é um assistente de roteamento de tickets.
Sua função é analisar a mensagem do usuário e determinar qual equipe deve lidar com o problema, baseado nas descrições fornecidas.
Você deve escolher exatamente UMA equipe da lista abaixo:

${state.teams.map(team => `ID: ${team.id}
Nome: ${team.name}
Descrição: ${team.description}`).join('\n\n')}

Seja justo e imparcial, escolhendo a equipe que melhor corresponde à necessidade do usuário.`;

    const INSTRUCTION_TEMPLATE = `Com base na mensagem do usuário, identifique qual equipe é mais adequada para lidar com esta solicitação.
Responda apenas com o ID da equipe, sem adicionar nenhum texto adicional.`;

    // Usar o modelo para classificar para qual time encaminhar
    const routingResponse = await this.model.invoke(
      [
        {
          role: 'system',
          content: SYSTEM_TEMPLATE,
        },
        ...state.messages,
        {
          role: 'user',
          content: INSTRUCTION_TEMPLATE,
        },
      ],
    );
    
    // O ID da equipe será a resposta direta
    const teamId = typeof routingResponse.content === 'string' 
      ? routingResponse.content.trim() 
      : '';
    
    // Validar se o ID existe na lista de equipes
    const teamExists = state.teams.some(team => team.id === teamId);
    const selectedTeam = teamExists ? teamId : 'initial_routing';
    
    // Informar ao usuário sobre o encaminhamento
    const teamInfo = state.teams.find(team => team.id === teamId);
    const routingMessage = new AIMessage(
      teamExists && teamInfo
        ? `Vou encaminhar você para a equipe ${teamInfo.name} que é especializada em ${teamInfo.description}. Um momento, por favor.`
        : `Vou transferir você para nossa equipe de atendimento inicial para melhor avaliar sua solicitação.`
    );
    
    return {
      selectedTeam,
      messages: [...state.messages, routingMessage],
    };
  };

  private initialSupport = async (state: typeof this.StateAnnotation.State) => {
    const SYSTEM_TEMPLATE = `Você é da equipe de suporte da LangCorp, uma empresa que vende computadores.
Seja conciso em suas respostas.
Você pode conversar com os clientes e ajudá-los com perguntas básicas, mas se o cliente estiver com um problema técnico ou de faturamento,
não tente responder à pergunta diretamente ou coletar informações.
Em vez disso, transfira-o imediatamente para a equipe de faturamento ou técnica, pedindo ao usuário que aguarde um momento.
Caso contrário, responda apenas em tom de conversa.`;
    const supportResponse = await this.model.invoke([
      { role: 'system', content: SYSTEM_TEMPLATE },
      ...state.messages,
    ]);

    const CATEGORIZATION_SYSTEM_TEMPLATE = `Você é um especialista em sistema de roteamento de suporte ao cliente.
Seu trabalho é detectar se um representante de suporte ao cliente está encaminhando um usuário para uma equipe de cobrança ou técnica, ou se está apenas respondendo em tom de conversa.`;
    const CATEGORIZATION_HUMAN_TEMPLATE = `A conversa anterior é uma interação entre um representante de suporte ao cliente e um usuário.
Extraia se o representante está encaminhando o usuário para uma equipe técnica ou de cobrança, ou se está apenas respondendo em tom de conversa.
Responda com um objeto JSON contendo uma única chave chamada "nextRepresentative" com um dos seguintes valores:

Se o representante quiser encaminhar o usuário para a equipe de cobrança, responda apenas com a palavra "FATURAMENTO".
Se o representante quiser encaminhar o usuário para a equipe técnica, responda apenas com a palavra "TÉCNICO".
Caso contrário, responda apenas com a palavra "RESPONDER".`;
    const categorizationResponse = await this.model.invoke(
      [
        {
          role: 'system',
          content: CATEGORIZATION_SYSTEM_TEMPLATE,
        },
        ...state.messages,
        {
          role: 'user',
          content: CATEGORIZATION_HUMAN_TEMPLATE,
        },
      ],
      {
        response_format: {
          type: 'json_object',
        },
      },
    );
    const categorizationOutput = JSON.parse(
      categorizationResponse.content as string,
    );

    // Validar se a resposta contém o formato esperado
    if (
      !['FATURAMENTO', 'TÉCNICO', 'RESPONDER'].includes(
        categorizationOutput.nextRepresentative,
      )
    ) {
      categorizationOutput.nextRepresentative = 'RESPONDER'; // valor padrão
    }

    return {
      messages: [supportResponse],
      nextRepresentative: categorizationOutput.nextRepresentative,
    };
  };

  private billingSupport = async (state: typeof this.StateAnnotation.State) => {
    const SYSTEM_TEMPLATE = `Você é um especialista em suporte de cobrança da LangCorp, uma empresa que vende computadores.
Ajude o usuário da melhor forma possível, mas seja conciso em suas respostas.
Você pode autorizar reembolsos, o que pode ser feito transferindo o usuário para outro agente que coletará as informações necessárias.
Se fizer isso, presuma que o outro agente possui todas as informações necessárias sobre o cliente e seu pedido.
Você não precisa pedir mais informações ao usuário.

Ajude o usuário da melhor forma possível, mas seja conciso em suas respostas.`;

    let trimmedHistory = state.messages;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (trimmedHistory.at(-1)?._getType() === 'ai') {
      trimmedHistory = trimmedHistory.slice(0, -1);
    }

    const billingRepResponse = await this.model.invoke([
      {
        role: 'system',
        content: SYSTEM_TEMPLATE,
      },
      ...trimmedHistory,
    ]);
    const CATEGORIZATION_SYSTEM_TEMPLATE = `Seu trabalho é detectar se um representante de suporte de cobrança deseja reembolsar o usuário.`;
    const CATEGORIZATION_HUMAN_TEMPLATE = `O texto a seguir é uma resposta de um representante de suporte ao cliente.
Extraia se eles desejam reembolsar o usuário ou não.
Responda com um objeto JSON contendo uma única chave chamada "nextRepresentative" com um dos seguintes valores:

Se eles desejam reembolsar o usuário, responda apenas com a palavra "REEMBOLSO".
Caso contrário, responda apenas com a palavra "RESPONDER".

Aqui está o texto:

<text>
${billingRepResponse.content}
</text>.`;
    const categorizationResponse = await this.model.invoke(
      [
        {
          role: 'system',
          content: CATEGORIZATION_SYSTEM_TEMPLATE,
        },
        {
          role: 'user',
          content: CATEGORIZATION_HUMAN_TEMPLATE,
        },
      ],
      {
        response_format: {
          type: 'json_object',
        },
      },
    );
    const categorizationOutput = JSON.parse(
      categorizationResponse.content as string,
    );
    
    // Validar se a resposta contém o formato esperado
    if (
      !['REEMBOLSO', 'RESPONDER'].includes(categorizationOutput.nextRepresentative)
    ) {
      categorizationOutput.nextRepresentative = 'RESPONDER'; // valor padrão
    }

    return {
      messages: [billingRepResponse],
      nextRepresentative: categorizationOutput.nextRepresentative,
    };
  };

  private technicalSupport = async (
    state: typeof this.StateAnnotation.State,
  ) => {
    const SYSTEM_TEMPLATE = `Você é especialista em diagnosticar problemas técnicos de informática. Você trabalha para uma empresa chamada LangCorp, que vende computadores.
Ajude o usuário da melhor forma possível, mas seja conciso em suas respostas.`;

    let trimmedHistory = state.messages;
    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (trimmedHistory.at(-1)?._getType() === 'ai') {
      trimmedHistory = trimmedHistory.slice(0, -1);
    }

    const response = await this.model.invoke([
      {
        role: 'system',
        content: SYSTEM_TEMPLATE,
      },
      ...trimmedHistory,
    ]);

    return {
      messages: [response],
    };
  };
}
