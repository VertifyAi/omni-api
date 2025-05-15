/* eslint-disable @typescript-eslint/no-unused-vars */
import { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph } from '@langchain/langgraph';
import { ConfigurationAnnotation, ensureConfiguration } from './configuration';
import { StateAnnotation, InputStateAnnotation } from './state';
import { formatDocs, getMessageText, loadChatModel } from './utils';
import { z } from 'zod';
import { makeRetriever } from './retrieval';
// Define the function that calls the model

const SearchQuery = z.object({
  query: z.string().describe('Search the indexed documents for a query.'),
});

const DepartmentInfo = z.object({
  name: z.string().describe('Nome do departamento responsável'),
  contact: z.string().describe('Informações de contato do departamento'),
  description: z
    .string()
    .describe('Descrição do motivo da transferência para este departamento'),
});

async function generateQuery(
  state: typeof StateAnnotation.State,
  config?: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  const messages = state.messages;
  
  // Get the last user message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastUserMessage: any = messages[messages.length - 1];
  for (let i = messages.length - 1; i >= 0; i--) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = messages[i] as any;
    if (msg.role === 'user' || (msg.lc_kwargs && !msg.lc_kwargs.content?.includes('Obrigado'))) {
      lastUserMessage = msg;
      break;
    }
  }
  
  if (messages.length === 1 || !state.queries || state.queries.length === 0) {
    // It's the first user question. We will use the input directly to search.
    const humanInput = getMessageText(lastUserMessage);
    return { queries: [humanInput] };
  } else {
    const configuration = ensureConfiguration(config);
    // Feel free to customize the prompt, model, and other logic!
    const systemMessage = configuration.querySystemPromptTemplate
      .replace('{queries}', (state.queries || []).join('\n- '))
      .replace('{systemTime}', new Date().toISOString());

    const messageValue = [
      { role: 'system', content: systemMessage },
      lastUserMessage, // Usar apenas a última mensagem do usuário, não o histórico completo
    ];
    const model = (
      await loadChatModel(configuration.responseModel)
    ).withStructuredOutput(SearchQuery);

    const generated = await model.invoke(messageValue);
    return {
      queries: [generated.query],
      // Garantir que todas as funções mantenham o estado do onboarding
      userInfo: {
        ...state.userInfo,
        onboardingCompleted: true,
      },
      conversationStep: 'main_conversation',
    };
  }
}

async function retrieve(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  const query = state.queries[state.queries.length - 1];
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(query);
  return { retrievedDocs: response };
}

async function determineDepartment(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  const configuration = ensureConfiguration(config);
  const model = (await loadChatModel('openai/gpt-4')).withStructuredOutput(
    DepartmentInfo,
  );

  console.log('determineDepartment - PROCESSANDO DETERMINAÇÃO DO DEPARTAMENTO', {
    state: state,
    config: config,
  });

  const messageValue = [
    {
      role: 'system',
      content: `Analise a conversa e determine qual departamento é mais adequado para atender a solicitação do usuário.
      Considere o contexto da conversa e as informações disponíveis para tomar a melhor decisão.
      Retorne o nome do departamento, informações de contato e uma descrição clara do motivo da transferência.`,
    },
    ...state.messages,
  ];

  const departmentInfo = await model.invoke(messageValue);
  return { responsibleDepartment: departmentInfo };
}

async function handleIntroduction(
  state: typeof StateAnnotation.State,
): Promise<typeof StateAnnotation.Update> {
  const userInfo = state.userInfo || {};
  
  // ✅ VERIFICAÇÃO CRÍTICA: Se o userInfo já indica onboarding completo, não processamos mais esta função
  if (userInfo.onboardingCompleted && userInfo.name && userInfo.email) {
    // Retornamos explicitamente para o fluxo principal, sem processar mais nada
    return {
      conversationStep: 'main_conversation',
      userInfo: {
        ...userInfo,
        onboardingCompleted: true,
      },
    };
  }
  
  // Em vez de confiar no conversationStep, vamos analisar a última mensagem do assistente
  // para determinar em que etapa estamos
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastUserMessage: any = state.messages[state.messages.length - 1];
  const userMessageText = getMessageText(lastUserMessage);

  // Encontre a última mensagem do assistente, se existir
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastAssistantMessage: any = null;
  let lastAssistantMessageText = '';
  
  // CORREÇÃO: Melhoria na detecção de mensagens do assistente
  for (let i = state.messages.length - 2; i >= 0; i--) {
    const msg = state.messages[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgAny = msg as any;
    
    // Verificamos múltiplos padrões possíveis de mensagens do assistente
    if (
      msgAny.role === 'assistant' || 
      (msgAny.lc_kwargs && msgAny.lc_kwargs.content && msgAny.content && !msgAny.content.includes('@'))
    ) {
      lastAssistantMessage = msg;
      lastAssistantMessageText = getMessageText(msg);
      
      break;
    }
  }

  // VERIFICAÇÃO ESPECIAL PARA ÚLTIMA MENSAGEM DO ASSISTENTE
  // Se a última mensagem do assistente contém texto de "obrigado" e "diga com o que você precisa de ajuda"
  // Consideramos que estamos na etapa final do onboarding
  if (
    lastAssistantMessageText.includes('precisa de ajuda') && 
    lastAssistantMessageText.includes('Obrigado')
  ) {
    return {
      conversationStep: 'main_conversation',
      userInfo: {
        ...userInfo,
        onboardingCompleted: true,
      },
    };
  }

  // Padrões de "pular" ou "não responder"
  const skipPatterns = [
    'pular',
    'não quero',
    'não vou',
    'não preciso',
    'não tenho',
    'não tenho interesse',
    'não quero informar',
    'não vou informar',
    'não quero dar',
    'não vou dar',
    'pode pular',
    'pode ignorar',
    'não quero responder',
    'não vou responder',
    'não preciso informar',
    'não preciso responder',
  ];

  const isSkipping = skipPatterns.some((pattern) =>
    userMessageText.toLowerCase().includes(pattern),
  );

  // ESTRATÉGIA: Determinamos a etapa da conversa baseada no conteúdo real das mensagens
  
  // CASO 1: Primeira mensagem do usuário - inicie o fluxo
  if (state.messages.length === 1) {
    return {
      messages: [
        {
          role: 'assistant',
          content:
            'Olá! Sou o assistente virtual da empresa. Antes de começarmos, preciso de algumas informações suas.\n\nPoderia me informar seu nome completo?',
        },
      ],
      userInfo: {
        name: null,
        email: null,
        onboardingCompleted: false,
      },
      conversationStep: 'asking_name',
    };
  }
  
  // IMPORTANTE: Verifique o email ANTES do nome para evitar confusão
  // CASO 2: Verificamos se a última mensagem do assistente está pedindo o email
  if (lastAssistantMessageText.includes('email profissional')) {
    if (isSkipping) {
      console.log('Usuário tentou pular a etapa de email');
      return {
        messages: [
          {
            role: 'assistant',
            content:
              'Compreendo sua preocupação. O email profissional é importante para que possamos manter um canal de comunicação direto e enviar atualizações relevantes sobre seu atendimento. Você poderia me fornecer um email para contato?',
          },
        ],
        conversationStep: 'asking_email',
      };
    }
    
    // Obtemos o nome já armazenado
    const userName = userInfo.name;
    
    // Marcamos explicitamente como onboarding completo
    const completedUserInfo = {
      ...userInfo,
      email: userMessageText,
      onboardingCompleted: true,
    };
    
    return {
      userInfo: completedUserInfo,
      messages: [
        {
          role: 'assistant',
          content:
            `Obrigado ${userName}! Agora me diga com o que você precisa de ajuda, para que eu possa te direcionar melhor. 😊`,
        },
      ],
      conversationStep: 'main_conversation',
    };
  }
  
  // CASO 3: Verificamos se a última mensagem do assistente está pedindo o nome
  if (lastAssistantMessageText.includes('nome completo')) {
    if (isSkipping) {
      console.log('Usuário tentou pular a etapa de nome');
      return {
        messages: [
          {
            role: 'assistant',
            content:
              'Entendo sua preocupação com a privacidade. No entanto, para melhor atendê-lo e garantir um serviço personalizado, preciso do seu nome. Você poderia reconsiderar e me informar como gostaria de ser chamado?',
          },
        ],
        conversationStep: 'asking_name',
      };
    }

    return {
      userInfo: {
        ...userInfo,
        name: userMessageText,
      },
      messages: [
        {
          role: 'assistant',
          content: `Obrigado, ${userMessageText}! Agora, poderia me informar seu email profissional?`,
        },
      ],
      conversationStep: 'asking_email',
    };
  }
  
  // CASO 4: O usuário já finalizou o onboarding (verificamos pelo userInfo)
  if (userInfo.onboardingCompleted && userInfo.name && userInfo.email) {
    return {
      userInfo: {
        ...userInfo,  // Preservar o userInfo existente
        onboardingCompleted: true,
      },
      conversationStep: 'main_conversation',
    };
  }
  
  // CASO 5: Alternativa - se temos o nome e o usuário forneceu provavelmente o email
  if (userInfo.name && !userInfo.email && state.messages.length >= 5) {
    
    const userName = userInfo.name;
    
    // Marcamos explicitamente como onboarding completo
    const completedUserInfo = {
      ...userInfo,
      email: userMessageText,
      onboardingCompleted: true,
    };
    
    return {
      userInfo: completedUserInfo,
      messages: [
        {
          role: 'assistant',
          content:
            `Obrigado ${userName}! Agora me diga com o que você precisa de ajuda, para que eu possa te direcionar melhor. 😊`,
        },
      ],
      conversationStep: 'main_conversation',
    };
  }
  
  // CASO 6: Alternativa - se o usuário está na mensagem 3, provavelmente forneceu o nome
  if (!userInfo.name && state.messages.length === 3) {
    return {
      userInfo: {
        ...userInfo,
        name: userMessageText,
      },
      messages: [
        {
          role: 'assistant',
          content: `Obrigado, ${userMessageText}! Agora, poderia me informar seu email profissional?`,
        },
      ],
      conversationStep: 'asking_email',
    };
  }
  
  // CASO 7: Se já estamos na conversa principal, vamos manter assim
  if (state.conversationStep === 'main_conversation') {
    return {
      conversationStep: 'main_conversation',
      userInfo: {
        ...userInfo,
        onboardingCompleted: true,
      },
    };
  }
  
  // CASO 8: Fallback - algo não está certo, vamos reiniciar o fluxo
  return {
    messages: [
      {
        role: 'assistant',
        content:
          'Parece que tivemos um problema com nosso fluxo de conversa. Vamos recomeçar.\n\nPoderia me informar seu nome completo?',
      },
    ],
    userInfo: {
      name: null,
      email: null,
      onboardingCompleted: false,
    },
    conversationStep: 'asking_name',
  };
}

async function respond(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  // Se o onboarding não estiver completo, não processa a resposta
  const userInfo = state.userInfo || {};
  const conversationStep = state.conversationStep || 'initialization';
  
  // VERIFICAÇÃO ALTERNATIVA: Se não temos o flag de onboarding, mas temos todas as informações necessárias,
  // consideramos o onboarding como completo
  if (!userInfo.onboardingCompleted && userInfo.name && userInfo.email) {
    userInfo.onboardingCompleted = true;
  }
  
  // Verificações mais robustas para garantir que estamos prontos para gerar uma resposta
  const isOnboardingComplete = Boolean(userInfo.onboardingCompleted);
  const hasName = Boolean(userInfo.name);
  const hasEmail = Boolean(userInfo.email);
  
  // IMPORTANTE: Verificamos se o onboarding está completo
  if (!isOnboardingComplete || !hasName || !hasEmail) {
    return {};
  }
  
  const configuration = ensureConfiguration(config);
  const model = await loadChatModel('openai/gpt-4');

  const retrievedDocs = formatDocs(state.retrievedDocs);
  const departmentInfo = state.responsibleDepartment;

  const { companyName, ticketId, clientId } = configuration;

  // IMPORTANTE: Adicionamos o prompt sistema mais específico agora que o onboarding está concluído
  const systemPrompt = `${configuration.responseSystemPromptTemplate}
  
  Empresa: ${companyName}
  Ticket: ${ticketId}
  Cliente: ${clientId}
  
  Informações do usuário:
  Nome: ${userInfo.name}
  Email: ${userInfo.email}
  
  Informações do departamento responsável:
  ${
    departmentInfo
      ? `
  Departamento: ${departmentInfo.name}
  Contato: ${departmentInfo.contact}
  Motivo: ${departmentInfo.description}
  `
      : 'Nenhum departamento específico identificado.'
  }`;

  const messageValue = [
    {
      role: 'system',
      content: systemPrompt,
    },
    { role: 'user', content: `Contexto relevante:\n${retrievedDocs}` },
    ...state.messages,
  ];

  const response = await model.invoke(messageValue);
  return { 
    messages: [response],
    conversationStep: 'main_conversation',
    userInfo: {
      ...userInfo,
      onboardingCompleted: true,
    }
  };
}

// Lay out the nodes and edges to define a graph
const builder = new StateGraph(
  {
    stateSchema: StateAnnotation,
    // The only input field is the user
    input: InputStateAnnotation,
  },
  ConfigurationAnnotation,
)
  .addNode('handleIntroduction', handleIntroduction)
  .addNode('generateQuery', generateQuery)
  .addNode('retrieve', retrieve)
  .addNode('determineDepartment', determineDepartment)
  .addNode('respond', respond)
  .addEdge('__start__', 'handleIntroduction')
  .addConditionalEdges('handleIntroduction', (state) => {
    // Agora vamos analisar também o conteúdo das mensagens para tomar decisões
    const typedState = state as unknown as typeof StateAnnotation.State;
    const userInfo = typedState.userInfo || {};
    
    // Verificamos explicitamente se o onboarding está completo no userInfo
    const isOnboardingComplete = Boolean(userInfo.onboardingCompleted);
    const hasName = Boolean(userInfo.name);
    const hasEmail = Boolean(userInfo.email);
    const inMainConversation = typedState.conversationStep === 'main_conversation';
    
    // Se qualquer uma destas condições for verdadeira, avançamos para o fluxo principal
    // 1. O usuário tem o flag onboardingCompleted e estamos na etapa main_conversation
    // 2. O usuário tem o flag onboardingCompleted, nome e email preenchidos
    if (
      (isOnboardingComplete && inMainConversation) || 
      (isOnboardingComplete && hasName && hasEmail)
    ) {
      return 'generateQuery';
    }
    
    return [];
  })
  .addEdge('generateQuery', 'retrieve')
  .addEdge('retrieve', 'determineDepartment')
  .addEdge('determineDepartment', 'respond');

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = builder.compile({
  interruptBefore: [], // if you want to update the state before calling the tools
  interruptAfter: [],
});

graph.name = 'Retrieval Graph'; // Customizes the name displayed in LangSmith
