// Anthropic Chat API - Claude as head agent with tool support
import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicChatRequest {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: any[]; // Anthropic tool definitions
}

export async function POST(request: NextRequest) {
  try {
    const body: AnthropicChatRequest = await request.json();
    const { 
      apiKey, 
      model, 
      messages, 
      system,
      stream = false, 
      temperature,
      max_tokens = 4096,
      tools,
    } = body;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 400 }
      );
    }
    
    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }
    
    console.log(`[Anthropic Chat] Sending request with model ${model}, ${messages.length} messages`);
    
    const anthropicBody: any = {
      model,
      max_tokens,
      messages,
    };
    
    if (system) {
      anthropicBody.system = system;
    }
    
    if (temperature !== undefined) {
      anthropicBody.temperature = temperature;
    }
    
    if (tools && tools.length > 0) {
      anthropicBody.tools = tools;
    }
    
    if (stream) {
      anthropicBody.stream = true;
    }
    
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Anthropic Chat] Error: ${res.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Anthropic API error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }
    
    // Non-streaming response
    if (!stream) {
      const data = await res.json();
      
      // Extract text content from response
      let content = '';
      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            content += block.text;
          } else if (block.type === 'tool_use') {
            // Include tool calls in a format the frontend can parse
            content += `<tool_call>${JSON.stringify({
              id: block.id,
              name: block.name,
              arguments: block.input,
            })}</tool_call>`;
          }
        }
      }
      
      return NextResponse.json({
        content,
        model: data.model,
        done: data.stop_reason === 'end_turn',
        stopReason: data.stop_reason,
        usage: data.usage,
      });
    }
    
    // Streaming response - transform Anthropic SSE to our format
    const encoder = new TextEncoder();
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            
            try {
              const json = JSON.parse(data);
              
              // Handle different event types
              if (json.type === 'content_block_delta') {
                if (json.delta?.type === 'text_delta') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ 
                      content: json.delta.text, 
                      done: false 
                    })}\n\n`)
                  );
                }
              } else if (json.type === 'message_stop') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      },
    });
    
    const body_stream = res.body;
    if (!body_stream) {
      return NextResponse.json(
        { error: 'No response body from Anthropic' },
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
    console.error('Anthropic chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to chat with Anthropic' },
      { status: 500 }
    );
  }
}
