import { NextRequest, NextResponse } from 'next/server';
import { ProviderType, ChatMessage } from '@/lib/providers';

// Server-side direct calls to providers (no CORS issues here)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

const DEFAULT_SYSTEM_PROMPT = `You are MrSnappy ⚡, a friendly and helpful local AI assistant.

Key traits:
- You're fast, efficient, and get things done
- You run locally on the user's machine
- You're privacy-focused — all conversations stay local
- You have a bit of personality — witty but not annoying
- You use the ⚡ emoji occasionally as your signature

You were created by Torsbotech, a small AI company. You're proud to be open source and local-first.

Be helpful, be concise, and be real. Skip the corporate speak.`;

interface ChatRequest {
  messages: ChatMessage[];
  provider?: ProviderType;
  providerUrl?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  // Legacy support
  ollamaUrl?: string;
}

async function chatWithOllama(messages: ChatMessage[], model: string, temperature?: number) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(temperature !== undefined && { options: { temperature } }),
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    content: data.message?.content || '',
    model: data.model,
    done: data.done,
  };
}

async function chatWithLMStudio(messages: ChatMessage[], model: string, temperature?: number) {
  const res = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer lm-studio',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(temperature !== undefined && { temperature }),
    }),
  });

  if (!res.ok) {
    throw new Error(`LM Studio error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const choice = data.choices[0];
  return {
    content: choice?.message?.content || '',
    model: data.model,
    done: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      provider: providerType = 'ollama',
      model = 'llama3.2',
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      temperature,
    } = await request.json() as ChatRequest;

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);

    // Call the appropriate provider directly (server-side, no CORS)
    let response;
    if (providerType === 'lmstudio' || providerType === 'openai-compatible') {
      response = await chatWithLMStudio(fullMessages, model, temperature);
    } else {
      response = await chatWithOllama(fullMessages, model, temperature);
    }

    return NextResponse.json({
      content: response.content,
      model: response.model,
      done: response.done,
      provider: providerType,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
