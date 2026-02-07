// Ollama Chat Proxy - Handles both streaming and non-streaming requests
import { NextRequest, NextResponse } from 'next/server';

// Get Ollama URL from environment or use default
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: OllamaChatRequest = await request.json();
    const { model, messages, stream = false, options } = body;
    
    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }
    
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...(options && { options }),
      }),
    });
    
    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return NextResponse.json(
        { error: `Ollama error: ${ollamaRes.status} - ${errorText}` },
        { status: ollamaRes.status }
      );
    }
    
    // Non-streaming response
    if (!stream) {
      const data: OllamaChatResponse = await ollamaRes.json();
      return NextResponse.json({
        content: data.message?.content || '',
        model: data.model,
        done: data.done,
      });
    }
    
    // Streaming response - transform Ollama's NDJSON to SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
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
            // Skip malformed JSON lines
          }
        }
      },
    });
    
    const body_stream = ollamaRes.body;
    if (!body_stream) {
      return NextResponse.json(
        { error: 'No response body from Ollama' },
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
    console.error('Ollama chat proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy chat to Ollama' },
      { status: 500 }
    );
  }
}
