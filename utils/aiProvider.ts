import { GoogleGenAI } from "@google/genai";

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  sendMessage: (messages: AIMessage[], systemPrompt?: string) => AsyncIterable<string>;
}

// Gemini Provider
export class GeminiProvider implements AIProvider {
  private ai: any;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async *sendMessage(messages: AIMessage[], systemPrompt?: string): AsyncIterable<string> {
    if (messages.length === 0) {
      throw new Error('No messages provided');
    }

    // Для Gemini: история - это все сообщения кроме последнего, последнее - текущее сообщение
    const historyMessages = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    const history = historyMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

    const chat = this.ai.chats.create({
      model: this.model,
      config: {
        systemInstruction: systemPrompt || '',
      },
      history: history,
    });

    const result = await chat.sendMessageStream({ message: lastMessage.content });

    for await (const chunk of result) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }
}

// OpenAI Provider
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async *sendMessage(messages: AIMessage[], systemPrompt?: string): AsyncIterable<string> {
    if (messages.length === 0) {
      throw new Error('No messages provided');
    }

    // Убеждаемся что последнее сообщение от пользователя
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));

    if (systemPrompt) {
      formattedMessages.unshift({
        role: 'system',
        content: systemPrompt
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

      for (const line of lines) {
        if (line === 'data: [DONE]') continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

// Anthropic Provider
export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async *sendMessage(messages: AIMessage[], systemPrompt?: string): AsyncIterable<string> {
    if (messages.length === 0) {
      throw new Error('No messages provided');
    }

    // Убеждаемся что последнее сообщение от пользователя
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Anthropic API format
    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        system: systemPrompt || '',
        max_tokens: 4096,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

      for (const line of lines) {
        if (line === 'data: [DONE]') continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            const content = data.delta?.text;
            if (content) {
              yield content;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

// Factory function to create provider
export function createAIProvider(
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom',
  apiKey: string,
  model: string
): AIProvider {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey, model);
    case 'openai':
      return new OpenAIProvider(apiKey, model);
    case 'anthropic':
      return new AnthropicProvider(apiKey, model);
    case 'custom':
        throw new Error('Custom provider not implemented yet');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

