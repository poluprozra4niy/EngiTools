import { supabase } from '../lib/supabase';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  sendMessage: (messages: AIMessage[], systemPrompt?: string) => AsyncIterable<string>;
}

// Unified Proxy Provider
// This class replaces all client-side logic (Gemini, OpenAI, Anthropic)
// It sends the message history to the backend, which handles the actual AI usage securely.
export class ProxyAIProvider implements AIProvider {
  private providerName: string;
  private model: string;

  constructor(providerName: string, model: string) {
    this.providerName = providerName;
    this.model = model;
  }

  async *sendMessage(messages: AIMessage[], systemPrompt?: string): AsyncIterable<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Unauthorized: Please log in to use AI features.');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages,
        model: this.model,
        systemPrompt,
        provider: this.providerName
      })
    });

    if (!response.ok) {
      let errorMessage = 'AI Request failed';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to read response stream');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  }
}

export function createAIProvider(
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom',
  apiKey: string, // apiKey is now ignored/unused on client, but kept for signature compatibility if needed
  model: string
): AIProvider {
  // We ignore the apiKey passed here because we don't trust client keys anymore.
  // The server will load the encrypted key from the DB.
  return new ProxyAIProvider(provider, model);
}
