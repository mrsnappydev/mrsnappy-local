// Ollama Model Pull API - Download/pull models
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface PullRequest {
  model: string;
  insecure?: boolean;
  ollamaUrl?: string;  // Allow client to specify Ollama URL
}

/**
 * POST /api/providers/ollama/pull
 * Start pulling a model from Ollama registry
 * Returns a streaming response with progress updates
 */
export async function POST(request: NextRequest) {
  try {
    const body: PullRequest = await request.json();
    const { model, insecure, ollamaUrl } = body;
    
    // Use provided URL or fall back to default
    const targetUrl = ollamaUrl || DEFAULT_OLLAMA_URL;

    if (!model) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    console.log(`[Ollama] Starting pull for model: ${model} from ${targetUrl}`);

    // Start the pull request to Ollama
    const res = await fetch(`${targetUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: model,
        insecure: insecure || false,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Ollama] Pull failed: ${errorText}`);
      return NextResponse.json(
        { error: `Ollama pull failed: ${errorText}` },
        { status: res.status }
      );
    }

    // Stream the response back to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const data = JSON.parse(line);
                
                // Format progress for client
                const progress = {
                  status: data.status || 'downloading',
                  digest: data.digest,
                  total: data.total,
                  completed: data.completed,
                  percentage: data.total ? Math.round((data.completed / data.total) * 100) : 0,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
                );

                // Check if pull is complete
                if (data.status === 'success') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              if (data.status === 'success') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch {
              // Ignore
            }
          }
        } catch (error) {
          console.error('[Ollama] Stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Ollama] Pull error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pull failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/providers/ollama/pull?model=xxx
 * Check if a model exists (can be used to verify pull completed)
 */
export async function GET(request: NextRequest) {
  const model = request.nextUrl.searchParams.get('model');
  const ollamaUrl = request.nextUrl.searchParams.get('url') || DEFAULT_OLLAMA_URL;
  
  if (!model) {
    return NextResponse.json(
      { error: 'Model name is required' },
      { status: 400 }
    );
  }

  try {
    // Check if model exists by trying to show it
    const res = await fetch(`${ollamaUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        exists: true,
        model: model,
        details: data,
      });
    } else {
      return NextResponse.json({
        exists: false,
        model: model,
      });
    }
  } catch (error) {
    return NextResponse.json({
      exists: false,
      model: model,
      error: error instanceof Error ? error.message : 'Check failed',
    });
  }
}
