import { NextRequest } from 'next/server';
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

interface StreamRequest {
  messages: ChatMessage[];
  provider?: ProviderType;
  providerUrl?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  // Legacy support
  ollamaUrl?: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

interface OpenAIStreamChoice {
  index: number;
  delta: { role?: string; content?: string };
  finish_reason: string | null;
}

interface OpenAIStreamChunk {
  id: string;
  model: string;
  choices: OpenAIStreamChoice[];
}

async function streamFromOllama(messages: ChatMessage[], model: string, temperature?: number): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      ...(temperature !== undefined && { options: { temperature } }),
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama stream error: ${res.status} ${res.statusText}`);
  }

  // Transform Ollama's NDJSON stream to SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return res.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const json: OllamaChatResponse = JSON.parse(line);
            if (json.message?.content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: json.message.content, done: json.done })}\n\n`
                )
              );
            }
            if (json.done) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      },
    })
  );
}

async function streamFromLMStudio(messages: ChatMessage[], model: string, temperature?: number): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer lm-studio',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      ...(temperature !== undefined && { temperature }),
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`LM Studio stream error: ${res.status} ${res.statusText}`);
  }

  // Transform OpenAI SSE stream to our unified SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  return res.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove "data: " prefix
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            continue;
          }

          try {
            const json: OpenAIStreamChunk = JSON.parse(data);
            const delta = json.choices[0]?.delta;
            if (delta?.content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    content: delta.content, 
                    done: json.choices[0]?.finish_reason === 'stop' 
                  })}\n\n`
                )
              );
            }
            if (json.choices[0]?.finish_reason === 'stop') {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      },
      flush(controller) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const data = trimmed.slice(6);
              const json: OpenAIStreamChunk = JSON.parse(data);
              const delta = json.choices[0]?.delta;
              if (delta?.content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: delta.content, done: true })}\n\n`
                  )
                );
              }
            } catch {
              // Ignore
            }
          }
        }
      },
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const { 
      messages,
      provider: providerType = 'ollama',
      model = 'llama3.2',
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      temperature,
    } = await request.json() as StreamRequest;

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);

    // Call the appropriate provider directly (server-side, no CORS)
    let stream: ReadableStream<Uint8Array>;
    if (providerType === 'lmstudio' || providerType === 'openai-compatible') {
      stream = await streamFromLMStudio(fullMessages, model, temperature);
    } else {
      stream = await streamFromOllama(fullMessages, model, temperature);
    }

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
