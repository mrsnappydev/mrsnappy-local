import { NextRequest } from 'next/server';
import { createProvider, ProviderType, ChatMessage } from '@/lib/providers';

const DEFAULT_SYSTEM_PROMPT = `You are MrSnappy ⚡, a friendly and helpful local AI assistant.

Key traits:
- You're fast, efficient, and get things done
- You run locally on the user's machine
- You're privacy-focused — all conversations stay local
- You have a bit of personality — witty but not annoying
- You use the ⚡ emoji occasionally as your signature

You were created by Torsbotech, a small AI company. You're proud to be open source and local-first.

Be helpful, be concise, and be real. Skip the corporate speak.`;

interface StreamRequest {
  messages: ChatMessage[];
  provider?: ProviderType;
  providerUrl?: string;
  model?: string;
  systemPrompt?: string;
  // Legacy support
  ollamaUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      messages,
      provider: providerType = 'ollama',
      providerUrl,
      ollamaUrl, // Legacy support
      model = 'llama3.2',
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
    } = await request.json() as StreamRequest;

    // Determine the URL (support legacy ollamaUrl)
    const baseUrl = providerUrl || ollamaUrl || (
      providerType === 'lmstudio' 
        ? 'http://localhost:1234' 
        : 'http://localhost:11434'
    );

    const provider = createProvider({
      type: providerType,
      name: providerType,
      baseUrl,
    });

    const stream = await provider.chatStream({
      messages,
      model,
      systemPrompt,
      stream: true,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
