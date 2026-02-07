// Model Metadata Database for MrSnappy Local
// Curated information about popular local models

import { ModelCapability } from './capabilities';

export interface ModelMetadata {
  name: string;
  capabilities: ModelCapability[];
  strengths: string[];
  contextLength?: number;
  parameterSizes?: string[];
  description?: string;
  website?: string;
}

// Database of popular models with their capabilities
// Keys are base model names (without quantization/size suffixes)
export const MODEL_DATABASE: Record<string, ModelMetadata> = {
  // === Meta Llama Family ===
  'llama3': {
    name: 'Llama 3',
    capabilities: ['general', 'coding', 'instruction', 'reasoning'],
    strengths: ['Excellent instruction following', 'Strong reasoning', 'Good at coding'],
    contextLength: 8192,
    parameterSizes: ['8B', '70B'],
    description: 'Meta\'s latest open-weight model with strong all-around performance',
  },
  'llama3.1': {
    name: 'Llama 3.1',
    capabilities: ['general', 'coding', 'instruction', 'reasoning', 'long-context', 'multilingual'],
    strengths: ['128k context window', 'Improved reasoning', 'Tool use support'],
    contextLength: 131072,
    parameterSizes: ['8B', '70B', '405B'],
    description: 'Extended context version with multilingual improvements',
  },
  'llama3.2': {
    name: 'Llama 3.2',
    capabilities: ['general', 'coding', 'instruction', 'vision', 'small'],
    strengths: ['Multimodal support', 'Edge deployment', 'Efficient'],
    contextLength: 131072,
    parameterSizes: ['1B', '3B', '11B', '90B'],
    description: 'Multimodal version with vision capabilities',
  },
  'llama2': {
    name: 'Llama 2',
    capabilities: ['general', 'coding'],
    strengths: ['Well-tested', 'Large community', 'Many fine-tunes available'],
    contextLength: 4096,
    parameterSizes: ['7B', '13B', '70B'],
    description: 'Previous generation, still very capable',
  },
  'codellama': {
    name: 'Code Llama',
    capabilities: ['coding', 'instruction'],
    strengths: ['Code completion', 'Code explanation', 'Multiple programming languages', 'Infilling'],
    contextLength: 16384,
    parameterSizes: ['7B', '13B', '34B', '70B'],
    description: 'Llama 2 fine-tuned specifically for code',
  },
  
  // === Mistral Family ===
  'mistral': {
    name: 'Mistral',
    capabilities: ['general', 'coding', 'fast', 'instruction'],
    strengths: ['Efficient architecture', 'Fast inference', 'Good quality/speed balance'],
    contextLength: 8192,
    parameterSizes: ['7B'],
    description: 'Compact but powerful, great for everyday use',
  },
  'mistral-nemo': {
    name: 'Mistral Nemo',
    capabilities: ['general', 'coding', 'instruction', 'long-context'],
    strengths: ['12B parameters', '128k context', 'Function calling'],
    contextLength: 131072,
    parameterSizes: ['12B'],
    description: 'Collaboration between Mistral AI and NVIDIA',
  },
  'mixtral': {
    name: 'Mixtral',
    capabilities: ['general', 'coding', 'multilingual', 'reasoning'],
    strengths: ['Mixture of Experts', 'Fast for its capability', 'Strong multilingual'],
    contextLength: 32768,
    parameterSizes: ['8x7B', '8x22B'],
    description: 'MoE architecture - uses only 2 experts per token',
  },
  'codestral': {
    name: 'Codestral',
    capabilities: ['coding', 'instruction'],
    strengths: ['State-of-the-art code generation', '80+ languages', 'Fill-in-the-middle'],
    contextLength: 32768,
    parameterSizes: ['22B'],
    description: 'Mistral\'s dedicated coding model',
  },
  
  // === Qwen Family ===
  'qwen': {
    name: 'Qwen',
    capabilities: ['general', 'coding', 'multilingual'],
    strengths: ['Strong Chinese & English', 'Good reasoning', 'Code capable'],
    contextLength: 8192,
    parameterSizes: ['0.5B', '1.8B', '4B', '7B', '14B', '72B'],
    description: 'Alibaba\'s multilingual model family',
  },
  'qwen2': {
    name: 'Qwen 2',
    capabilities: ['general', 'coding', 'multilingual', 'instruction', 'reasoning'],
    strengths: ['29+ languages', 'Strong coding', 'Extended context'],
    contextLength: 131072,
    parameterSizes: ['0.5B', '1.5B', '7B', '57B', '72B'],
    description: 'Second generation with major improvements',
  },
  'qwen2.5': {
    name: 'Qwen 2.5',
    capabilities: ['general', 'coding', 'multilingual', 'instruction', 'reasoning', 'long-context'],
    strengths: ['Latest release', 'Improved reasoning', 'Better instruction following'],
    contextLength: 131072,
    parameterSizes: ['0.5B', '1.5B', '3B', '7B', '14B', '32B', '72B'],
    description: 'Latest Qwen with state-of-the-art performance',
  },
  'qwen2.5-coder': {
    name: 'Qwen 2.5 Coder',
    capabilities: ['coding', 'instruction'],
    strengths: ['Matches GPT-4 on code', '92 languages', 'Code completion & generation'],
    contextLength: 131072,
    parameterSizes: ['0.5B', '1.5B', '3B', '7B', '14B', '32B'],
    description: 'Dedicated coding model rivaling closed-source',
  },
  
  // === DeepSeek Family ===
  'deepseek-coder': {
    name: 'DeepSeek Coder',
    capabilities: ['coding', 'instruction'],
    strengths: ['Excellent code generation', 'Fill-in-middle', 'Multi-language'],
    contextLength: 16384,
    parameterSizes: ['1.3B', '6.7B', '33B'],
    description: 'Specialized for code with strong performance',
  },
  'deepseek-coder-v2': {
    name: 'DeepSeek Coder V2',
    capabilities: ['coding', 'reasoning', 'instruction', 'long-context'],
    strengths: ['MoE architecture', 'Matches GPT-4 Turbo on code', '128k context'],
    contextLength: 131072,
    parameterSizes: ['16B', '236B'],
    description: 'State-of-the-art open-source coding model',
  },
  'deepseek-v2': {
    name: 'DeepSeek V2',
    capabilities: ['general', 'coding', 'reasoning', 'long-context'],
    strengths: ['236B MoE', 'Efficient inference', 'Strong reasoning'],
    contextLength: 131072,
    parameterSizes: ['236B'],
    description: 'General purpose MoE model',
  },
  
  // === Vision Models ===
  'llava': {
    name: 'LLaVA',
    capabilities: ['vision', 'general'],
    strengths: ['Image understanding', 'Visual Q&A', 'Image description'],
    contextLength: 4096,
    parameterSizes: ['7B', '13B', '34B'],
    description: 'Large Language and Vision Assistant',
  },
  'llava-llama3': {
    name: 'LLaVA Llama 3',
    capabilities: ['vision', 'general', 'instruction'],
    strengths: ['Latest LLaVA', 'Llama 3 base', 'Better reasoning'],
    contextLength: 8192,
    parameterSizes: ['8B'],
    description: 'LLaVA built on Llama 3',
  },
  'bakllava': {
    name: 'BakLLaVA',
    capabilities: ['vision', 'general'],
    strengths: ['Mistral base', 'Good image understanding', 'Efficient'],
    contextLength: 4096,
    parameterSizes: ['7B'],
    description: 'LLaVA variant using Mistral',
  },
  'moondream': {
    name: 'Moondream',
    capabilities: ['vision', 'small', 'fast'],
    strengths: ['Tiny footprint', 'Fast inference', 'Good for edge'],
    contextLength: 2048,
    parameterSizes: ['1.8B'],
    description: 'Tiny but capable vision model',
  },
  
  // === Small / Efficient Models ===
  'phi': {
    name: 'Phi',
    capabilities: ['general', 'small', 'fast', 'reasoning'],
    strengths: ['Runs on limited hardware', 'Quick responses', 'Good reasoning for size'],
    contextLength: 2048,
    parameterSizes: ['1.3B', '2.7B'],
    description: 'Microsoft\'s small language model',
  },
  'phi3': {
    name: 'Phi-3',
    capabilities: ['general', 'small', 'fast', 'reasoning', 'coding'],
    strengths: ['Punches above weight', 'Mobile-friendly', 'Strong reasoning'],
    contextLength: 4096,
    parameterSizes: ['3.8B', '7B', '14B'],
    description: 'Latest Phi with impressive capability per parameter',
  },
  'phi3.5': {
    name: 'Phi-3.5',
    capabilities: ['general', 'small', 'fast', 'reasoning', 'coding', 'vision'],
    strengths: ['Vision variant available', 'MoE option', '128k context'],
    contextLength: 131072,
    parameterSizes: ['3.8B', '4.2B MoE'],
    description: 'Latest Phi with vision and MoE variants',
  },
  'gemma': {
    name: 'Gemma',
    capabilities: ['general', 'small', 'fast', 'instruction'],
    strengths: ['Google quality', 'Efficient', 'Good instruction following'],
    contextLength: 8192,
    parameterSizes: ['2B', '7B'],
    description: 'Google\'s lightweight open model',
  },
  'gemma2': {
    name: 'Gemma 2',
    capabilities: ['general', 'small', 'fast', 'instruction', 'reasoning'],
    strengths: ['Improved architecture', 'Better reasoning', '27B option'],
    contextLength: 8192,
    parameterSizes: ['2B', '9B', '27B'],
    description: 'Second generation with significant improvements',
  },
  'tinyllama': {
    name: 'TinyLlama',
    capabilities: ['general', 'small', 'fast'],
    strengths: ['1.1B parameters', 'Very fast', 'Low memory usage'],
    contextLength: 2048,
    parameterSizes: ['1.1B'],
    description: 'Compact model for constrained environments',
  },
  'stablelm': {
    name: 'StableLM',
    capabilities: ['general', 'small', 'fast'],
    strengths: ['Stability AI quality', 'Efficient', 'Good for chat'],
    contextLength: 4096,
    parameterSizes: ['1.6B', '3B', '7B'],
    description: 'Stability AI\'s language model family',
  },
  
  // === Specialized / Creative Models ===
  'wizard': {
    name: 'WizardLM',
    capabilities: ['instruction', 'reasoning', 'general'],
    strengths: ['Complex instruction following', 'Evolved prompting', 'Reasoning'],
    contextLength: 8192,
    parameterSizes: ['7B', '13B', '70B'],
    description: 'Fine-tuned for complex instructions',
  },
  'wizardcoder': {
    name: 'WizardCoder',
    capabilities: ['coding', 'instruction'],
    strengths: ['Code instructions', 'Debugging', 'Code explanation'],
    contextLength: 8192,
    parameterSizes: ['7B', '13B', '34B'],
    description: 'WizardLM fine-tuned for code',
  },
  'wizardmath': {
    name: 'WizardMath',
    capabilities: ['reasoning', 'instruction'],
    strengths: ['Mathematical reasoning', 'Step-by-step solutions', 'Problem solving'],
    contextLength: 8192,
    parameterSizes: ['7B', '13B', '70B'],
    description: 'WizardLM fine-tuned for math',
  },
  'orca': {
    name: 'Orca',
    capabilities: ['reasoning', 'instruction', 'general'],
    strengths: ['Explanation traces', 'Reasoning chains', 'Teaching'],
    contextLength: 4096,
    parameterSizes: ['3B', '7B', '13B'],
    description: 'Trained on explanation traces from GPT-4',
  },
  'orca2': {
    name: 'Orca 2',
    capabilities: ['reasoning', 'instruction', 'general'],
    strengths: ['Improved reasoning', 'Cautious responses', 'Math'],
    contextLength: 4096,
    parameterSizes: ['7B', '13B'],
    description: 'Microsoft\'s improved Orca',
  },
  'solar': {
    name: 'Solar',
    capabilities: ['general', 'instruction', 'reasoning'],
    strengths: ['Depth up-scaling', 'Strong performance', 'Korean support'],
    contextLength: 4096,
    parameterSizes: ['10.7B'],
    description: 'Upstage\'s depth up-scaled model',
  },
  'yi': {
    name: 'Yi',
    capabilities: ['general', 'multilingual', 'long-context'],
    strengths: ['Strong Chinese', 'Long context', 'Good reasoning'],
    contextLength: 200000,
    parameterSizes: ['6B', '9B', '34B'],
    description: '01.AI\'s bilingual model',
  },
  'yi-coder': {
    name: 'Yi Coder',
    capabilities: ['coding', 'instruction'],
    strengths: ['Efficient coding', 'Good at completions', '128k context'],
    contextLength: 131072,
    parameterSizes: ['1.5B', '9B'],
    description: 'Yi fine-tuned for code',
  },
  'command-r': {
    name: 'Command R',
    capabilities: ['general', 'instruction', 'long-context', 'multilingual'],
    strengths: ['RAG optimized', 'Tool use', '128k context'],
    contextLength: 131072,
    parameterSizes: ['35B', '104B'],
    description: 'Cohere\'s retrieval-augmented model',
  },
  
  // === Uncensored / Roleplay ===
  'dolphin': {
    name: 'Dolphin',
    capabilities: ['general', 'instruction', 'uncensored'],
    strengths: ['No alignment restrictions', 'Follows any instruction', 'Creative'],
    contextLength: 8192,
    parameterSizes: ['7B', '70B'],
    description: 'Uncensored fine-tune, use responsibly',
  },
  'dolphin-mixtral': {
    name: 'Dolphin Mixtral',
    capabilities: ['general', 'coding', 'uncensored'],
    strengths: ['MoE + uncensored', 'Creative freedom', 'Good coding'],
    contextLength: 32768,
    parameterSizes: ['8x7B'],
    description: 'Dolphin on Mixtral base',
  },
  'nous-hermes': {
    name: 'Nous Hermes',
    capabilities: ['general', 'instruction', 'creative'],
    strengths: ['Creative writing', 'Roleplay', 'Good instruction following'],
    contextLength: 8192,
    parameterSizes: ['7B', '13B'],
    description: 'Nous Research\'s instruction-tuned model',
  },
  'openhermes': {
    name: 'OpenHermes',
    capabilities: ['general', 'instruction', 'reasoning', 'coding'],
    strengths: ['Diverse training', 'Good reasoning', 'Function calling'],
    contextLength: 8192,
    parameterSizes: ['7B'],
    description: 'Open-source Hermes on Mistral',
  },
  'neural-chat': {
    name: 'Neural Chat',
    capabilities: ['general', 'instruction', 'creative'],
    strengths: ['Conversational', 'Intel optimized', 'Good personality'],
    contextLength: 4096,
    parameterSizes: ['7B'],
    description: 'Intel\'s conversational model',
  },
  'openchat': {
    name: 'OpenChat',
    capabilities: ['general', 'instruction', 'reasoning'],
    strengths: ['Competitive with ChatGPT', 'C-RLFT training', 'Efficient'],
    contextLength: 8192,
    parameterSizes: ['7B'],
    description: 'Trained with C-RLFT method',
  },
  'starling': {
    name: 'Starling',
    capabilities: ['general', 'instruction', 'reasoning'],
    strengths: ['RLHF trained', 'High quality responses', 'Good reasoning'],
    contextLength: 8192,
    parameterSizes: ['7B'],
    description: 'Berkeley\'s RLHF model',
  },
  'zephyr': {
    name: 'Zephyr',
    capabilities: ['general', 'instruction', 'creative'],
    strengths: ['DPO trained', 'Helpful and harmless', 'Good chat'],
    contextLength: 8192,
    parameterSizes: ['7B'],
    description: 'Hugging Face\'s DPO fine-tune of Mistral',
  },
};

// Pattern matching rules for model name -> capabilities inference
const CAPABILITY_PATTERNS: Array<{ pattern: RegExp; capabilities: ModelCapability[] }> = [
  { pattern: /code|coder|starcoder|codegen|programming/i, capabilities: ['coding'] },
  { pattern: /vision|llava|bakllava|moondream|image|visual/i, capabilities: ['vision'] },
  { pattern: /math|wizard.*math|metamath/i, capabilities: ['reasoning'] },
  { pattern: /dolphin|uncensored|abliterat/i, capabilities: ['uncensored'] },
  { pattern: /hermes|roleplay|rp/i, capabilities: ['creative', 'roleplay'] },
  { pattern: /tiny|small|mini|nano|micro/i, capabilities: ['small', 'fast'] },
  { pattern: /instruct|chat/i, capabilities: ['instruction'] },
  { pattern: /long|128k|200k|1m/i, capabilities: ['long-context'] },
];

/**
 * Get capabilities for a model by name
 * Tries exact match first, then base name, then pattern matching
 */
export function getModelCapabilities(modelName: string): ModelCapability[] {
  const normalizedName = modelName.toLowerCase().trim();
  
  // Extract base name (remove size, quantization, etc.)
  // Examples: llama3:8b-instruct-q4_0 -> llama3
  //           deepseek-coder-v2:16b -> deepseek-coder-v2
  //           phi-3.5-mini-instruct -> phi3.5
  const baseName = normalizedName
    .replace(/[:\-]?(q[0-9]|iq[0-9]|f16|f32|bf16)[_\-]?[a-z0-9_]*/gi, '') // Remove quantization
    .replace(/[:\-]?[0-9]+\.?[0-9]*[bm]/gi, '') // Remove size (7b, 1.5b, etc.)
    .replace(/[:\-]?(instruct|chat|base)/gi, '') // Remove variants
    .replace(/[:\-]latest$/gi, '') // Remove :latest
    .replace(/[\-_\.]+$/g, '') // Remove trailing separators
    .replace(/[\-_]+/g, '-'); // Normalize separators
  
  // Try exact match in database
  for (const [key, metadata] of Object.entries(MODEL_DATABASE)) {
    if (normalizedName.includes(key) || baseName === key.replace(/[\-_\.]/g, '-')) {
      return metadata.capabilities;
    }
  }
  
  // Try pattern matching
  const matchedCapabilities = new Set<ModelCapability>();
  for (const { pattern, capabilities } of CAPABILITY_PATTERNS) {
    if (pattern.test(normalizedName)) {
      capabilities.forEach(c => matchedCapabilities.add(c));
    }
  }
  
  if (matchedCapabilities.size > 0) {
    return Array.from(matchedCapabilities);
  }
  
  // Default to general
  return ['general'];
}

/**
 * Get full metadata for a model if available
 */
export function getModelMetadata(modelName: string): ModelMetadata | null {
  const normalizedName = modelName.toLowerCase().trim();
  
  // Try to find a matching entry
  for (const [key, metadata] of Object.entries(MODEL_DATABASE)) {
    if (normalizedName.includes(key)) {
      return metadata;
    }
  }
  
  return null;
}

/**
 * Get all models that have a specific capability
 */
export function getModelsByCapability(capability: ModelCapability): string[] {
  return Object.entries(MODEL_DATABASE)
    .filter(([, metadata]) => metadata.capabilities.includes(capability))
    .map(([key]) => key);
}

/**
 * Get recommended models for a task
 */
export function getRecommendedModels(task: 'coding' | 'vision' | 'small' | 'creative' | 'reasoning'): Array<{ key: string; metadata: ModelMetadata }> {
  const models = Object.entries(MODEL_DATABASE)
    .filter(([, metadata]) => metadata.capabilities.includes(task))
    .map(([key, metadata]) => ({ key, metadata }));
  
  // Sort by number of matching capabilities (more specific models first)
  return models.sort((a, b) => {
    // Prefer models where this is a primary capability (fewer total capabilities)
    if (a.metadata.capabilities.length !== b.metadata.capabilities.length) {
      return a.metadata.capabilities.length - b.metadata.capabilities.length;
    }
    return 0;
  });
}
