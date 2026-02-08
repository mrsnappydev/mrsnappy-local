// Local LLM API - Called by Claude to delegate to Ollama/LM Studio
import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';

interface LocalLLMRequest {
  prompt: string;
  model?: string;
  provider?: 'ollama' | 'lmstudio';
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LocalLLMRequest = await request.json();
    const { 
      prompt, 
      model,
      provider = 'ollama',
      temperature = 0.7,
      maxTokens = 2048,
    } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Local LLM] Provider: ${provider}, Model: ${model || 'default'}`);
    console.log(`[Local LLM] Prompt: ${prompt.slice(0, 100)}...`);
    
    let response: Response;
    let content: string;
    let usedModel: string;
    
    if (provider === 'lmstudio') {
      // LM Studio uses OpenAI-compatible API
      response = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio',
        },
        body: JSON.stringify({
          model: model || 'default',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LM Studio error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      content = data.choices?.[0]?.message?.content || '';
      usedModel = data.model || model || 'lmstudio';
      
    } else {
      // Ollama
      // First, get available models if none specified
      let targetModel = model;
      if (!targetModel) {
        const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`);
        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          // Pick first available model
          targetModel = tags.models?.[0]?.name || 'llama3.2';
        } else {
          targetModel = 'llama3.2';
        }
      }
      
      response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          prompt,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${error}`);
      }
      
      const data = await response.json();
      content = data.response || '';
      usedModel = targetModel;
    }
    
    console.log(`[Local LLM] Response from ${usedModel}: ${content.slice(0, 100)}...`);
    
    return NextResponse.json({
      success: true,
      content,
      model: usedModel,
      provider,
    });
    
  } catch (error) {
    console.error('[Local LLM] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to call local LLM' },
      { status: 500 }
    );
  }
}
