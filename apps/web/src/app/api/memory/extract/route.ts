import { NextResponse } from 'next/server';
import { MEMORY_EXTRACTION_PROMPT } from '@/types/memory';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractRequest {
  messages: Message[];
  provider: string;
  providerUrl: string;
  model: string;
}

interface ExtractedMemory {
  category: 'personal' | 'preference' | 'technical' | 'project' | 'context';
  content: string;
  importance: 'low' | 'medium' | 'high';
}

export async function POST(request: Request) {
  try {
    const body: ExtractRequest = await request.json();
    const { messages, provider, providerUrl, model } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ memories: [] });
    }

    // Format conversation for analysis
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Build the extraction request based on provider
    let memories: ExtractedMemory[] = [];

    if (provider === 'lmstudio') {
      // LM Studio (OpenAI-compatible API)
      const response = await fetch(`${providerUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'default',
          messages: [
            { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
            { role: 'user', content: `Here is the conversation to analyze:\n\n${conversationText}` },
          ],
          temperature: 0.3, // Lower temperature for more consistent extraction
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      memories = parseMemories(content);

    } else {
      // Ollama
      const response = await fetch(`${providerUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          messages: [
            { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
            { role: 'user', content: `Here is the conversation to analyze:\n\n${conversationText}` },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content || '[]';
      memories = parseMemories(content);
    }

    return NextResponse.json({ 
      memories,
      extractedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Memory extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract memories', memories: [] },
      { status: 500 }
    );
  }
}

// Parse AI response into structured memories
function parseMemories(content: string): ExtractedMemory[] {
  try {
    // Find JSON array in the response (handles markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON array found in response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and normalize each memory
    const validCategories = ['personal', 'preference', 'technical', 'project', 'context'];
    const validImportance = ['low', 'medium', 'high'];

    return parsed
      .filter(item => 
        item && 
        typeof item.content === 'string' && 
        item.content.trim().length > 0 &&
        validCategories.includes(item.category)
      )
      .map(item => ({
        category: item.category,
        content: item.content.trim(),
        importance: validImportance.includes(item.importance) ? item.importance : 'medium',
      }));

  } catch (error) {
    console.error('Failed to parse memories:', error);
    return [];
  }
}
