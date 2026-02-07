// API Route: Download models via Ollama pull
// Supports Huggingface repos: ollama pull hf.co/username/repo

import { NextRequest, NextResponse } from 'next/server';

interface DownloadRequest {
  modelId: string;
  source: 'huggingface' | 'ollama-library';
}

interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { modelId, source } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Format model name for Ollama pull
    let pullName = modelId;
    if (source === 'huggingface') {
      // For Huggingface models, prefix with hf.co/
      pullName = `hf.co/${modelId}`;
    }

    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    // Start the pull request
    const pullResponse = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pullName, stream: false }),
    });

    if (!pullResponse.ok) {
      const error = await pullResponse.text();
      return NextResponse.json(
        { error: `Failed to start download: ${error}` },
        { status: pullResponse.status }
      );
    }

    // For non-streaming, wait for completion
    const result = await pullResponse.json();
    
    return NextResponse.json({
      success: true,
      modelId: pullName,
      status: result.status || 'Downloaded successfully',
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Streaming download endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const modelId = searchParams.get('model');
  const source = searchParams.get('source') || 'ollama-library';

  if (!modelId) {
    return NextResponse.json(
      { error: 'Model ID is required' },
      { status: 400 }
    );
  }

  // Format model name for Ollama pull
  let pullName = modelId;
  if (source === 'huggingface') {
    pullName = `hf.co/${modelId}`;
  }

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  try {
    // Start streaming pull
    const pullResponse = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pullName, stream: true }),
    });

    if (!pullResponse.ok || !pullResponse.body) {
      const error = await pullResponse.text();
      return NextResponse.json(
        { error: `Failed to start download: ${error}` },
        { status: pullResponse.status }
      );
    }

    // Transform Ollama's NDJSON stream to SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformedStream = pullResponse.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const text = decoder.decode(chunk);
          const lines = text.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const progress: PullProgress = JSON.parse(line);
              
              // Calculate percentage if we have total/completed
              let percentage = 0;
              if (progress.total && progress.completed) {
                percentage = Math.round((progress.completed / progress.total) * 100);
              }
              
              const event = {
                status: progress.status,
                digest: progress.digest,
                percentage,
                completed: progress.completed,
                total: progress.total,
              };
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );
              
              // Check for completion
              if (progress.status === 'success') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch {
              // Skip malformed lines
            }
          }
        },
      })
    );

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Download stream error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
