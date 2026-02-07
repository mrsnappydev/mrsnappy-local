// API Route: Download models to central storage
// Supports:
// - Huggingface GGUF downloads (direct to storage)
// - Ollama library pulls (via ollama pull)

import { NextRequest, NextResponse } from 'next/server';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import {
  ensureStorageDirectory,
  getModelDownloadPath,
  registerModel,
  getStoragePath,
} from '@/lib/models/storage';
import { detectFormat, extractQuantization, extractParameters } from '@/lib/models/types';

interface DownloadRequest {
  modelId: string;
  source: 'huggingface' | 'ollama-library';
  filename?: string;  // For HF: specific file to download
  hfRepo?: string;    // HF repo ID
}

interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

/**
 * POST /api/models/download
 * Start a model download (non-streaming)
 */
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { modelId, source, filename, hfRepo } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // For Ollama library pulls, use ollama directly
    if (source === 'ollama-library') {
      return handleOllamaPull(modelId, false);
    }

    // For Huggingface, download to central storage
    if (source === 'huggingface') {
      return handleHuggingfaceDownload(modelId, filename, hfRepo);
    }

    return NextResponse.json(
      { error: 'Invalid source' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/models/download
 * Streaming download endpoint with progress updates
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const modelId = searchParams.get('model');
  const source = (searchParams.get('source') || 'ollama-library') as 'huggingface' | 'ollama-library';
  const filename = searchParams.get('filename') || undefined;
  const hfRepo = searchParams.get('hfRepo') || undefined;
  const direct = searchParams.get('direct') === 'true';  // Direct HF download to storage

  if (!modelId) {
    return NextResponse.json(
      { error: 'Model ID is required' },
      { status: 400 }
    );
  }

  // If direct HF download requested, download to central storage
  if (source === 'huggingface' && direct) {
    return handleStreamingHuggingfaceDownload(modelId, filename, hfRepo);
  }

  // Default: use Ollama pull (for both HF and Ollama library)
  return handleStreamingOllamaPull(modelId, source);
}

/**
 * Handle non-streaming Ollama pull
 */
async function handleOllamaPull(modelId: string, stream: boolean) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const pullResponse = await fetch(`${ollamaUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelId, stream: false }),
  });

  if (!pullResponse.ok) {
    const error = await pullResponse.text();
    return NextResponse.json(
      { error: `Failed to start download: ${error}` },
      { status: pullResponse.status }
    );
  }

  const result = await pullResponse.json();
  
  return NextResponse.json({
    success: true,
    modelId,
    status: result.status || 'Downloaded successfully',
  });
}

/**
 * Handle streaming Ollama pull with SSE progress
 */
async function handleStreamingOllamaPull(modelId: string, source: 'huggingface' | 'ollama-library') {
  // Format model name for Ollama pull
  let pullName = modelId;
  if (source === 'huggingface') {
    pullName = `hf.co/${modelId}`;
  }

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

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
}

/**
 * Handle non-streaming Huggingface download to central storage
 */
async function handleHuggingfaceDownload(modelId: string, filename?: string, hfRepo?: string) {
  const repo = hfRepo || modelId;
  
  // If no filename specified, we need to find the recommended one
  if (!filename) {
    // Fetch model files and pick recommended
    const filesResponse = await fetch(`https://huggingface.co/api/models/${repo}/tree/main`);
    if (!filesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch model files from Huggingface' },
        { status: 500 }
      );
    }
    
    const files = await filesResponse.json();
    const ggufFiles = files.filter((f: { path: string }) => f.path.endsWith('.gguf'));
    
    if (ggufFiles.length === 0) {
      return NextResponse.json(
        { error: 'No GGUF files found in this repository' },
        { status: 400 }
      );
    }
    
    // Pick Q4_K_M or first file
    const q4km = ggufFiles.find((f: { path: string }) => f.path.includes('Q4_K_M'));
    filename = q4km?.path || ggufFiles[0].path;
  }

  // At this point filename is guaranteed to be set
  const finalFilename = filename as string;

  // Ensure storage directory exists
  await ensureStorageDirectory();
  
  const downloadUrl = `https://huggingface.co/${repo}/resolve/main/${finalFilename}`;
  const destPath = getModelDownloadPath(finalFilename);
  
  try {
    // Download the file
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: `Failed to download: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get file size
    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Write to file
    const fileStream = createWriteStream(destPath);
    const readable = Readable.fromWeb(response.body as any);
    await pipeline(readable, fileStream);
    
    // Register in storage
    const model = await registerModel({
      filename: finalFilename,
      path: destPath,
      size: totalSize,
      format: detectFormat(finalFilename),
      quantization: extractQuantization(finalFilename),
      parameters: extractParameters(finalFilename),
      downloadedAt: Date.now(),
      source: 'huggingface',
      sourceUrl: downloadUrl,
      hfRepo: repo,
      hfFile: finalFilename,
      importedTo: [],
    });
    
    return NextResponse.json({
      success: true,
      model,
      storagePath: destPath,
    });
    
  } catch (error) {
    // Clean up partial download
    try {
      await fs.unlink(destPath);
    } catch {}
    
    throw error;
  }
}

/**
 * Handle streaming Huggingface download with SSE progress
 */
async function handleStreamingHuggingfaceDownload(modelId: string, filename?: string, hfRepo?: string) {
  const repo = hfRepo || modelId;
  
  // If no filename specified, find recommended
  if (!filename) {
    const filesResponse = await fetch(`https://huggingface.co/api/models/${repo}/tree/main`);
    if (!filesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch model files from Huggingface' },
        { status: 500 }
      );
    }
    
    const files = await filesResponse.json();
    const ggufFiles = files.filter((f: { path: string }) => f.path.endsWith('.gguf'));
    
    if (ggufFiles.length === 0) {
      return NextResponse.json(
        { error: 'No GGUF files found' },
        { status: 400 }
      );
    }
    
    const q4km = ggufFiles.find((f: { path: string }) => f.path.includes('Q4_K_M'));
    filename = q4km?.path || ggufFiles[0].path;
  }

  // At this point filename is guaranteed to be set
  const finalFilename = filename as string;

  await ensureStorageDirectory();
  
  const downloadUrl = `https://huggingface.co/${repo}/resolve/main/${finalFilename}`;
  const destPath = getModelDownloadPath(finalFilename);
  
  // Start download
  const response = await fetch(downloadUrl);
  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: `Failed to start download: ${response.statusText}` },
      { status: response.status }
    );
  }
  
  const contentLength = response.headers.get('content-length');
  const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
  
  // Create SSE stream
  const encoder = new TextEncoder();
  let bytesDownloaded = 0;
  
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const fileStream = createWriteStream(destPath);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            fileStream.end();
            
            // Register in storage
            await registerModel({
              filename: finalFilename,
              path: destPath,
              size: totalSize || bytesDownloaded,
              format: detectFormat(finalFilename),
              quantization: extractQuantization(finalFilename),
              parameters: extractParameters(finalFilename),
              downloadedAt: Date.now(),
              source: 'huggingface',
              sourceUrl: downloadUrl,
              hfRepo: repo,
              hfFile: finalFilename,
              importedTo: [],
            });
            
            // Send completion
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'complete',
              percentage: 100,
              completed: bytesDownloaded,
              total: totalSize || bytesDownloaded,
              storagePath: destPath,
            })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }
          
          // Write chunk to file
          fileStream.write(Buffer.from(value));
          bytesDownloaded += value.length;
          
          // Send progress update every ~1MB or 5%
          const percentage = totalSize ? Math.round((bytesDownloaded / totalSize) * 100) : 0;
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: `Downloading... ${percentage}%`,
            percentage,
            completed: bytesDownloaded,
            total: totalSize,
          })}\n\n`));
        }
      } catch (error) {
        fileStream.end();
        // Clean up partial download
        try {
          await fs.unlink(destPath);
        } catch {}
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          status: 'error',
          error: error instanceof Error ? error.message : 'Download failed',
        })}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
