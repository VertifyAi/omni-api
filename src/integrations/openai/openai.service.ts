import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Readable } from 'stream';
import {
  OpenAIChatMessage,
  OpenAIChatMessageResponse,
  OpenAIChatThread,
} from 'src/utils/types/openai.types';
import { CreateAgentDto } from 'src/agents/dto/create-agent.dto';
import { screeningSystemPrompt } from 'src/agents/prompts';
import { Team } from 'src/teams/entities/teams.entity';
import * as FormData from 'form-data';

type OpenAIStreamResponse =
  | string
  | {
      action: 'request_human_assistance';
      priority_level: string;
      target_team: string;
      [key: string]: unknown;
    };

type OpenAIChatAssistant = {
  id: string;
  object: string;
  created_at: number;
  name: string;
  description: string;
};

type OpenAIFunction = {
  name: string;
  description: string;
  strict: boolean;
  parameters: {
    type: string;
    required: string[];
    properties: {
      [key: string]: {
        type: string;
        description: string;
        enum: string[];
      };
    };
    additionalProperties: boolean;
  };
};

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openaiApiKey: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.openaiApiKey = `Bearer ${this.configService.get('OPENAI_API_KEY')}`;
  }

  /**
   * Cria um thread de conversa com a OpenAI
   * @param messages - As mensagens do thread
   * @param metadata - Metadados do thread
   * @returns A resposta da OpenAI
   */
  async createThreads(
    messages: OpenAIChatMessage[],
    metadata?: Record<string, unknown>,
  ): Promise<OpenAIChatThread> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') + '/threads',
          {
            messages,
            metadata,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao chamar a API de chat da OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria uma mensagem em um thread de conversa com a OpenAI
   * @param threadId - O ID do thread de conversa
   * @param message - A mensagem a ser criada
   * @returns A resposta da OpenAI
   */
  async createMessage(
    threadId: string,
    message: OpenAIChatMessage,
  ): Promise<OpenAIChatMessageResponse> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            '/threads/' +
            threadId +
            '/messages',
          message,
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao chamar a API de chat da OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria uma run de execução de um assistente ou modelo
   * @param threadId - O ID do thread de conversa
   * @param assistantIdOrModel - O ID do assistente ou nome do modelo
   * @returns A resposta da OpenAI
   */
  async createAndStreamRun(
    threadId: string,
    assistantIdOrModel: string,
  ): Promise<OpenAIStreamResponse> {
    try {
      const requestBody = {
        assistant_id: assistantIdOrModel,
        stream: true,
      };

      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            '/threads/' +
            threadId +
            '/runs',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
            responseType: 'stream',
          },
        ),
      );

      return this.processStream(data);
    } catch (error) {
      this.logger.error(
        `Erro ao chamar a API de chat da OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa um stream de eventos da OpenAI
   * @param stream - O stream de eventos
   * @returns A resposta final com mensagens
   */
  private async processStream(stream: Readable): Promise<OpenAIStreamResponse> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let responseText = '';

      stream.on('data', (chunk) => {
        buffer += chunk.toString();

        const eventParts = buffer.split('\n\n');
        buffer = eventParts.pop() || '';

        for (const eventStr of eventParts) {
          if (!eventStr.trim()) continue;

          try {
            const lines = eventStr.split('\n');
            let eventName = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                eventData = line.substring(5).trim();
              }
            }

            if (eventData === '[DONE]') {
              console.log('Stream finalizado.');
              return;
            }

            if (eventData && eventName) {
              const parsedData = JSON.parse(eventData);

              if (
                parsedData.object === 'thread.run' &&
                parsedData.status === 'requires_action'
              ) {
                const response = {
                  name: parsedData.required_action.submit_tool_outputs
                    .tool_calls[0].function.name,
                  arguments:
                    parsedData.required_action.submit_tool_outputs.tool_calls[0]
                      .function.arguments,
                };

                switch (response.name) {
                  case 'request_human_assistance':
                    const jsonResponse = JSON.parse(response.arguments);
                    resolve({
                      ...jsonResponse,
                      action: 'request_human_assistance',
                    });
                    break;
                  default:
                    break;
                }
              }

              if (
                parsedData.object === 'thread.message' &&
                parsedData.status === 'completed'
              ) {
                if (parsedData.content?.[0]?.text?.value) {
                  responseText = parsedData.content[0].text.value;
                  resolve(responseText);
                  return;
                }
              }
            }
          } catch (error) {
            console.error('Erro ao processar evento:', error, eventStr);
          }
        }
      });

      stream.on('end', () => {
        if (responseText) {
          resolve(responseText);
        } else {
          reject(
            new Error(
              'Evento "thread.message.completed" não encontrado no stream.',
            ),
          );
        }
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Cria um assistente com a OpenAI
   * @param name - O nome do assistente
   * @param description - A descrição do assistente
   * @returns A resposta da OpenAI
   */
  async createAssistant(
    createAgentDto: CreateAgentDto,
  ): Promise<OpenAIChatAssistant> {
    try {
      const instructions =
        createAgentDto.objective === 'screening'
          ? screeningSystemPrompt(
              createAgentDto.name,
              createAgentDto.segment,
              createAgentDto.tone,
              createAgentDto.description,
              createAgentDto.presentation_example,
              createAgentDto.interaction_example,
            )
          : '';
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') + '/assistants',
          {
            name: createAgentDto.name,
            description: createAgentDto.description,
            instructions,
            tools: [
              {
                type: 'file_search',
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'message_array',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      description: 'A collection of short messages.',
                      items: {
                        type: 'object',
                        properties: {
                          content: {
                            type: 'string',
                            description: 'The text of the message.',
                          },
                          timestamp: {
                            type: 'string',
                            description: 'The time the message was created.',
                          },
                        },
                        required: ['content', 'timestamp'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['messages'],
                  additionalProperties: false,
                },
              },
            },
            temperature: 0.01,
            top_p: 1.0,
            model: 'gpt-4o-mini',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao chamar a API de chat da OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria uma function para o assistente
   * @param assistantId - O ID do assistente
   * @param functionName - O nome da function
   * @param functionDescription - A descrição da function
   * @returns A resposta da OpenAI
   */
  async createFunction(
    createAgentDto: CreateAgentDto,
    teams: Team[],
  ): Promise<{
    type: string;
    function: OpenAIFunction;
  }> {
    switch (createAgentDto.objective) {
      default:
        return {
          type: 'function',
          function: {
            name: 'request_human_assistance',
            description:
              'Called when human assistance is requested to route issues to the correct team.',
            strict: true,
            parameters: {
              type: 'object',
              required: ['priority_level', 'target_team'],
              properties: {
                priority_level: {
                  type: 'string',
                  description: 'Priority level of the assistance request',
                  enum: ['low', 'medium', 'high', 'critical'],
                },
                target_team: {
                  type: 'string',
                  description:
                    'The specific team responsible for handling this type of issue.',
                  enum: teams.map((team) => team.name),
                },
              },
              additionalProperties: false,
            },
          },
        };
    }
  }

  /**
   * Cria um vector store para o assistente
   * @param assistantId - O ID do assistente
   * @param vectorStoreName - O nome do vector store
   * @returns A resposta da OpenAI
   */
  async createVectorStore(
    assistantId: string,
    vectorStoreName: string,
  ): Promise<{ id: string }> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') + '/vector_stores',
          {
            name: vectorStoreName,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao chamar a API de chat da OpenAI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Faz upload de um arquivo JSON para a OpenAI
   * @param jsonData - Os dados JSON para fazer upload
   * @param fileName - O nome do arquivo (opcional, padrão: 'data.json')
   * @returns O ID do arquivo enviado
   */
  async uploadJsonFile(
    jsonData: Record<string, unknown> | unknown[],
    fileName: string = 'data.json',
  ): Promise<string> {
    try {
      const formData = new FormData();
      const jsonString = JSON.stringify(jsonData, null, 2);
      console.log(jsonString, 'jsonString');
      const buffer = Buffer.from(jsonString, 'utf8');

      formData.append('file', buffer, {
        filename: fileName,
        contentType: 'application/json',
      });
      formData.append('purpose', 'assistants');

      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') + '/files',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );

      this.logger.log(`Arquivo JSON enviado com sucesso. ID: ${data.id}`);
      return data.id;
    } catch (error) {
      this.logger.error(
        `Erro ao fazer upload do arquivo JSON: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Adiciona um arquivo a um vector store
   * @param vectorStoreId - O ID do vector store
   * @param fileId - O ID do arquivo
   * @returns A resposta da OpenAI
   */
  async addFileToVectorStore(
    vectorStoreId: string,
    fileId: string,
  ): Promise<unknown> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            `/vector_stores/${vectorStoreId}/files`,
          {
            file_id: fileId,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );

      this.logger.log(
        `Arquivo ${fileId} adicionado ao vector store ${vectorStoreId}`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar arquivo ao vector store: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Transforma um JSON em arquivo e adiciona a um vector store
   * @param vectorStore - O vector store
   * @param jsonData - Os dados JSON
   * @param fileName - O nome do arquivo (opcional)
   * @returns O ID do arquivo criado
   */
  async addJsonToVectorStore(
    vectorStore: { id: string },
    jsonData: Record<string, unknown> | unknown[],
    fileName?: string,
  ): Promise<string> {
    try {
      // 1. Fazer upload do JSON como arquivo
      const fileId = await this.uploadJsonFile(jsonData, fileName);

      // 2. Adicionar o arquivo ao vector store
      await this.addFileToVectorStore(vectorStore.id, fileId);

      this.logger.log(
        `JSON transformado em arquivo e adicionado ao vector store ${vectorStore.id}`,
      );
      return fileId;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar JSON ao vector store: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Vincula um vector store a um assistente
   * @param assistantId - O ID do assistente
   * @param vectorStoreId - O ID do vector store
   * @returns A resposta da OpenAI
   */
  async attachVectorStoreToAssistant(
    assistantId: string,
    vectorStore: { id: string },
  ): Promise<unknown> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            `/assistants/${assistantId}`,
          {
            tool_resources: {
              file_search: {
                vector_store_ids: [vectorStore.id],
              },
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );

      this.logger.log(
        `Vector store ${vectorStore.id} vinculado ao assistente ${assistantId}`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao vincular vector store ao assistente: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Vincula uma function a um assistente
   * @param assistantId - O ID do assistente
   * @param function - A function a ser vinculada
   * @returns A resposta da OpenAI
   */
  async attachFunctionToAssistant(
    assistantId: string,
    functionToAttach: {
      type: string;
      function: OpenAIFunction;
    },
  ): Promise<unknown> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            `/assistants/${assistantId}`,
          {
            tools: [functionToAttach],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2',
              Authorization: this.openaiApiKey,
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao vincular function ao assistente: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
