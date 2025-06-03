export interface OpenAIChatMessage {
  role: OpenAIChatRole;
  content: string;
}

export interface OpenAIChatThread {
  id: string;
  object: string;
  created_at: number;
  metadata: Record<string, unknown>;
}

export type OpenAIChatRole = 'user' | 'assistant';

export interface OpenAIChatMessageResponse {
  id: string;
  object: string;
  created_at: number;
  assistant_id?: string;
  thread_id: string;
  role?: string;
  content: OpenAIChatMessageResponseContent[];
  attachments: OpenAIChatMessageResponseAttachment[];
  metadata: Record<string, unknown>;
}

export interface OpenAIChatMessageResponseContent {
  type: string;
  text: {
    value: string;
  };
}

export interface OpenAIChatMessageResponseAttachment {
  id: string;
  object: string;
  created_at: number;
  file_id: string;
}