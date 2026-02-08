// Ollama Status Proxy - Server-side fetch bypasses CORS
import { NextRequest, NextResponse } from 'next/server';

// Get Ollama URL from environment or use default
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export async function GET(request: NextRequest) {
  // Allow URL to be passed as query parameter (from client settings)
  const urlParam = request.nextUrl.searchParams.get('url');
  const ollamaUrl = urlParam || DEFAULT_OLLAMA_URL;
  
  console.log(`[Ollama Status] Checking connection to: ${ollamaUrl}`);
  
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
      // Ensure we're not caching stale results
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.log(`[Ollama Status] Got HTTP ${res.status} from ${ollamaUrl}`);
      return NextResponse.json({ 
        connected: false, 
        models: [],
        error: `Ollama returned ${res.status}`,
        baseUrl: ollamaUrl,
      });
    }
    
    const data: OllamaTagsResponse = await res.json();
    const models = (data.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      provider: 'ollama' as const,
    }));
    
    console.log(`[Ollama Status] Connected! Found ${models.length} models at ${ollamaUrl}`);
    
    return NextResponse.json({ 
      connected: true, 
      models,
      baseUrl: ollamaUrl,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Cannot connect to Ollama';
    console.log(`[Ollama Status] Connection failed to ${ollamaUrl}: ${errorMsg}`);
    
    return NextResponse.json({ 
      connected: false, 
      models: [],
      error: errorMsg,
      baseUrl: ollamaUrl,
      // Include troubleshooting info
      troubleshooting: {
        triedUrl: ollamaUrl,
        suggestion: ollamaUrl.includes('localhost') 
          ? 'Try using http://127.0.0.1:11434 instead of localhost'
          : 'Check if Ollama is running and accessible at this address',
      },
    });
  }
}
