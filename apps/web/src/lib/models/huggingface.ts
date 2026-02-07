// Huggingface API Client for MrSnappy Local

import {
  HuggingFaceModel,
  HuggingFaceFile,
  ModelFormat,
  detectFormat,
  extractQuantization,
  extractParameters,
  formatBytes,
} from './types';

const HF_API_BASE = 'https://huggingface.co/api';

export interface HFSearchOptions {
  query?: string;
  author?: string;
  tags?: string[];
  sort?: 'downloads' | 'likes' | 'lastModified';
  direction?: 'asc' | 'desc';
  limit?: number;
  filter?: 'gguf';  // Only show GGUF models
}

export interface GGUFFileInfo {
  filename: string;
  size: number;
  quantization?: string;
  downloadUrl: string;
}

export interface HFModelDetails {
  id: string;
  author?: string;
  downloads: number;
  likes: number;
  description?: string;
  tags: string[];
  ggufFiles: GGUFFileInfo[];
  parameters?: string;
}

/**
 * Search Huggingface for models
 */
export async function searchModels(options: HFSearchOptions = {}): Promise<HuggingFaceModel[]> {
  const params = new URLSearchParams();
  
  if (options.query) {
    params.set('search', options.query);
  }
  
  if (options.author) {
    params.set('author', options.author);
  }
  
  // Always filter for GGUF models by searching for the tag
  params.set('filter', 'gguf');
  
  if (options.sort) {
    params.set('sort', options.sort);
  }
  
  if (options.direction === 'asc') {
    params.set('direction', '-1');
  }
  
  params.set('limit', String(options.limit || 20));
  
  const response = await fetch(`${HF_API_BASE}/models?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }
  
  const models: HuggingFaceModel[] = await response.json();
  return models;
}

/**
 * Get detailed info about a model including its files
 */
export async function getModelDetails(repoId: string): Promise<HFModelDetails> {
  // Get model info
  const modelResponse = await fetch(`${HF_API_BASE}/models/${repoId}`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!modelResponse.ok) {
    throw new Error(`Failed to get model info: ${modelResponse.status}`);
  }
  
  const modelData: HuggingFaceModel = await modelResponse.json();
  
  // Get files list
  const filesResponse = await fetch(`${HF_API_BASE}/models/${repoId}/tree/main`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  let files: Array<{ path: string; size?: number; lfs?: { size: number } }> = [];
  if (filesResponse.ok) {
    files = await filesResponse.json();
  }
  
  // Filter for GGUF files
  const ggufFiles: GGUFFileInfo[] = files
    .filter(f => f.path.toLowerCase().endsWith('.gguf'))
    .map(f => ({
      filename: f.path,
      size: f.lfs?.size || f.size || 0,
      quantization: extractQuantization(f.path),
      downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${f.path}`,
    }))
    .sort((a, b) => {
      // Sort by quantization quality (Q4 before Q2, etc.)
      const aQuant = a.quantization || '';
      const bQuant = b.quantization || '';
      return bQuant.localeCompare(aQuant);
    });
  
  return {
    id: modelData.id,
    author: modelData.author,
    downloads: modelData.downloads,
    likes: modelData.likes,
    tags: modelData.tags,
    ggufFiles,
    parameters: extractParameters(modelData.id),
  };
}

/**
 * Get popular GGUF models for browsing
 */
export async function getPopularGGUFModels(limit: number = 20): Promise<HuggingFaceModel[]> {
  return searchModels({
    filter: 'gguf',
    sort: 'downloads',
    direction: 'desc',
    limit,
  });
}

/**
 * Get recommended GGUF file from a list (balanced quality/size)
 */
export function getRecommendedFile(files: GGUFFileInfo[]): GGUFFileInfo | null {
  if (files.length === 0) return null;
  
  // Prefer Q4_K_M as good balance of quality and size
  const q4km = files.find(f => f.quantization === 'Q4_K_M');
  if (q4km) return q4km;
  
  // Then Q5_K_M
  const q5km = files.find(f => f.quantization === 'Q5_K_M');
  if (q5km) return q5km;
  
  // Then any Q4
  const q4 = files.find(f => f.quantization?.startsWith('Q4'));
  if (q4) return q4;
  
  // Then any Q5
  const q5 = files.find(f => f.quantization?.startsWith('Q5'));
  if (q5) return q5;
  
  // Default to first file
  return files[0];
}

/**
 * Format model for display
 */
export function formatModelForDisplay(model: HuggingFaceModel): {
  name: string;
  author: string;
  stats: string;
} {
  const author = model.author || model.id.split('/')[0] || 'Unknown';
  const name = model.id.split('/')[1] || model.id;
  const downloads = model.downloads >= 1000 
    ? `${(model.downloads / 1000).toFixed(1)}k` 
    : String(model.downloads);
  
  return {
    name,
    author,
    stats: `⬇️ ${downloads} • ❤️ ${model.likes}`,
  };
}
