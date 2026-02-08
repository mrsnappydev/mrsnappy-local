// Ollama Library API - Get recommended models that can be pulled
import { NextResponse } from 'next/server';

// Curated list of recommended models for MrSnappy
// These are known to work well for chat and tool use
const RECOMMENDED_MODELS = [
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    description: 'Fast and capable small model from Meta. Great for quick responses.',
    size: '2.0GB',
    category: 'general',
    capabilities: ['chat', 'fast'],
    recommended: true,
  },
  {
    id: 'llama3.2:latest',
    name: 'Llama 3.2 8B',
    description: 'Excellent all-around model. Best balance of speed and quality.',
    size: '4.7GB',
    category: 'general',
    capabilities: ['chat', 'reasoning', 'tools'],
    recommended: true,
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    description: 'Previous gen but very reliable. Good tool support.',
    size: '4.7GB',
    category: 'general',
    capabilities: ['chat', 'reasoning', 'tools'],
    recommended: true,
  },
  {
    id: 'mistral:7b-instruct',
    name: 'Mistral 7B Instruct',
    description: 'Fast European model. Great instruction following.',
    size: '4.1GB',
    category: 'general',
    capabilities: ['chat', 'fast', 'instruct'],
    recommended: true,
  },
  {
    id: 'qwen2.5:7b-instruct',
    name: 'Qwen 2.5 7B Instruct',
    description: 'Alibaba\'s model. Excellent for multilingual and tool use.',
    size: '4.7GB',
    category: 'general',
    capabilities: ['chat', 'tools', 'multilingual'],
    recommended: true,
  },
  {
    id: 'qwen2.5:14b-instruct',
    name: 'Qwen 2.5 14B Instruct',
    description: 'More capable Qwen. Better reasoning, needs more RAM.',
    size: '9.0GB',
    category: 'general',
    capabilities: ['chat', 'tools', 'reasoning'],
    recommended: false,
  },
  {
    id: 'phi3:mini',
    name: 'Phi-3 Mini',
    description: 'Microsoft\'s small but mighty model. Very fast.',
    size: '2.3GB',
    category: 'general',
    capabilities: ['chat', 'fast', 'reasoning'],
    recommended: true,
  },
  {
    id: 'gemma2:9b',
    name: 'Gemma 2 9B',
    description: 'Google\'s open model. Good for creative tasks.',
    size: '5.4GB',
    category: 'general',
    capabilities: ['chat', 'creative'],
    recommended: false,
  },
  // Tool-calling specialists
  {
    id: 'adrienbrault/nous-hermes2pro:Q5_K_M',
    name: 'Hermes 2 Pro',
    description: '⭐ Best for tools! Specifically trained for function calling.',
    size: '5.0GB',
    category: 'tools',
    capabilities: ['chat', 'tools', 'function-calling'],
    recommended: true,
  },
  {
    id: 'command-r:latest',
    name: 'Command R',
    description: 'Cohere\'s model. Excellent tool use and RAG.',
    size: '20GB',
    category: 'tools',
    capabilities: ['chat', 'tools', 'rag'],
    recommended: false,
  },
  // Coding models
  {
    id: 'deepseek-coder:6.7b-instruct',
    name: 'DeepSeek Coder 6.7B',
    description: 'Great for code AND chat. The "instruct" version works for conversations.',
    size: '3.8GB',
    category: 'coding',
    capabilities: ['chat', 'coding', 'instruct'],
    recommended: true,
  },
  {
    id: 'codellama:7b-instruct',
    name: 'Code Llama 7B Instruct',
    description: 'Meta\'s coding model. Good for programming help.',
    size: '3.8GB',
    category: 'coding',
    capabilities: ['chat', 'coding', 'instruct'],
    recommended: false,
  },
  // Small/fast models
  {
    id: 'tinyllama:latest',
    name: 'TinyLlama 1.1B',
    description: 'Ultra small and fast. Good for testing or low-RAM systems.',
    size: '637MB',
    category: 'small',
    capabilities: ['chat', 'fast'],
    recommended: false,
  },
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    description: 'Google\'s tiny model. Surprisingly capable.',
    size: '1.6GB',
    category: 'small',
    capabilities: ['chat', 'fast'],
    recommended: false,
  },
];

/**
 * GET /api/providers/ollama/library
 * Get list of recommended models for MrSnappy
 */
export async function GET() {
  return NextResponse.json({
    models: RECOMMENDED_MODELS,
    categories: [
      { id: 'general', name: 'General Chat', icon: '💬' },
      { id: 'tools', name: 'Tool Use / Function Calling', icon: '🔧' },
      { id: 'coding', name: 'Coding', icon: '💻' },
      { id: 'small', name: 'Small & Fast', icon: '⚡' },
    ],
  });
}
