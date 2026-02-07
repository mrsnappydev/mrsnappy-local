import { NextRequest, NextResponse } from 'next/server';
import { ProviderType, ModelInfo } from '@/lib/providers';

// Server-side direct calls to providers
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OpenAIModel {
  id: string;
  object: string;
  owned_by: string;
}

interface DetectedProvider {
  type: ProviderType;
  name: string;
  baseUrl: string;
  connected: boolean;
  modelCount: number;
  models?: ModelInfo[];
}

interface ProviderStatus {
  connected: boolean;
  error?: string;
  models: ModelInfo[];
}

async function checkOllama(): Promise<{ connected: boolean; models: ModelInfo[]; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) {
      return { connected: false, models: [], error: `HTTP ${res.status}` };
    }
    
    const data = await res.json();
    const models = (data.models || []).map((m: OllamaModel) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      provider: 'ollama' as const,
    }));
    
    return { connected: true, models };
  } catch (error) {
    return { connected: false, models: [], error: error instanceof Error ? error.message : 'Connection failed' };
  }
}

async function checkLMStudio(): Promise<{ connected: boolean; models: ModelInfo[]; error?: string }> {
  try {
    const res = await fetch(`${LMSTUDIO_URL}/v1/models`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!res.ok) {
      return { connected: false, models: [], error: `HTTP ${res.status}` };
    }
    
    const data = await res.json();
    const models = (data.data || []).map((m: OpenAIModel) => ({
      id: m.id,
      name: m.id,
      provider: 'lmstudio' as const,
    }));
    
    return { connected: true, models };
  } catch (error) {
    return { connected: false, models: [], error: error instanceof Error ? error.message : 'Connection failed' };
  }
}

// GET /api/providers - Detect all available providers
export async function GET() {
  try {
    const [ollamaResult, lmstudioResult] = await Promise.all([
      checkOllama(),
      checkLMStudio(),
    ]);

    const providers: DetectedProvider[] = [
      {
        type: 'ollama',
        name: 'Ollama',
        baseUrl: OLLAMA_URL,
        connected: ollamaResult.connected,
        modelCount: ollamaResult.models.length,
      },
      {
        type: 'lmstudio',
        name: 'LM Studio',
        baseUrl: LMSTUDIO_URL,
        connected: lmstudioResult.connected,
        modelCount: lmstudioResult.models.length,
      },
    ];

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Provider detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect providers' },
      { status: 500 }
    );
  }
}

// POST /api/providers - Check a specific provider
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json() as { type: ProviderType; baseUrl?: string };

    let status: ProviderStatus;
    
    if (type === 'lmstudio' || type === 'openai-compatible') {
      const result = await checkLMStudio();
      status = {
        connected: result.connected,
        models: result.models,
        error: result.error,
      };
    } else {
      const result = await checkOllama();
      status = {
        connected: result.connected,
        models: result.models,
        error: result.error,
      };
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Provider status error:', error);
    return NextResponse.json(
      { error: 'Failed to get provider status' },
      { status: 500 }
    );
  }
}
