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

type OpenAIStreamResponse = 
  | string 
  | { action: 'request_human_assistance'; priority_level: string; target_team: string; [key: string]: unknown };

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
   * Cria uma run de execução de um assistente
   * @param threadId - O ID do thread de conversa
   * @param assistantId - O ID do assistente
   * @returns A resposta da OpenAI
   */
  async createAndStreamRun(
    threadId: string,
    assistantId: string,
  ): Promise<OpenAIStreamResponse> {
    try {
      const { data } = await lastValueFrom(
        this.httpService.post(
          this.configService.get('OPENAI_API_BASEURL') +
            '/threads/' +
            threadId +
            '/runs',
          {
            assistant_id: assistantId,
            stream: true,
          },
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
}
