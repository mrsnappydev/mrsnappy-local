// LM Studio Chat Proxy - Handles both streaming and non-streaming requests
import { NextRequest, NextResponse } from 'next/server';

// Get LM Studio URL from environment or use default
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LMStudioChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIChatChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: OpenAIChatChoice[];
}

interface OpenAIStreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason: string | null;
}

interface OpenAIStreamChunk {
  id: string;
  model: string;
  choices: OpenAIStreamChoice[];
}

export async function POST(request: NextRequest) {
  try {
    const body: LMStudioChatRequest = await request.json();
    const { model, messages, stream = false, temperature, max_tokens } = body;
    
    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }
    
    const lmstudioRes = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...(temperature !== undefined && { temperature }),
        ...(max_tokens !== undefined && { max_tokens }),
      }),
    });
    
    if (!lmstudioRes.ok) {
      const errorText = await lmstudioRes.text();
      return NextResponse.json(
        { error: `LM Studio error: ${lmstudioRes.status} - ${errorText}` },
        { status: lmstudioRes.status }
      );
    }
    
    // Non-streaming response
    if (!stream) {
      const data: OpenAIChatResponse = await lmstudioRes.json();
      const choice = data.choices[0];
      return NextResponse.json({
        content: choice?.message?.content || '',
        model: data.model,
        done: true,
      });
    }
    
    // Streaming response - transform OpenAI SSE to our unified SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    
    const transformStream = new TransformStream({
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
    });
    
    const body_stream = lmstudioRes.body;
    if (!body_stream) {
      return NextResponse.json(
        { error: 'No response body from LM Studio' },
        { status: 500 }
      );
    }
    
    return new Response(body_stream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('LM Studio chat proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy chat to LM Studio' },
      { status: 500 }
    );
  }
}
