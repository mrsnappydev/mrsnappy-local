// Model Registry Types for MrSnappy Local

export type ModelFormat = 'gguf' | 'safetensors' | 'pytorch' | 'mlx' | 'unknown';

export interface ModelCompatibility {
  ollama: boolean;
  lmstudio: boolean;
  notes?: string;
}

// Format to provider compatibility matrix
export const FORMAT_COMPATIBILITY: Record<ModelFormat, ModelCompatibility> = {
  gguf: {
    ollama: true,
    lmstudio: true,
    notes: 'Universal format for local inference',
  },
  safetensors: {
    ollama: false,
    lmstudio: false,
    notes: 'Needs conversion to GGUF',
  },
  pytorch: {
    ollama: false,
    lmstudio: false,
    notes: 'Needs conversion to GGUF',
  },
  mlx: {
    ollama: false,
    lmstudio: false,
    notes: 'Apple MLX format only',
  },
  unknown: {
    ollama: false,
    lmstudio: false,
    notes: 'Format not detected',
  },
};

export type ModelSource = 'local' | 'ollama' | 'lmstudio' | 'openai-compatible' | 'huggingface';
export type ModelProvider = 'ollama' | 'lmstudio' | 'openai-compatible';

export interface UnifiedModel {
  id: string;
  name: string;
  displayName: string;
  
  // Source info
  source: ModelSource;
  provider?: ModelProvider;  // If currently loaded in a provider
  
  // File info (for local/downloaded models)
  format?: ModelFormat;
  path?: string;
  sizeBytes?: number;
  
  // Huggingface info (if from HF)
  hfRepo?: string;
  hfFile?: string;
  
  // Status
  isDownloaded: boolean;
  isLoaded: boolean;
  
  // Compatibility
  compatibility: ModelCompatibility;
  
  // Metadata
  modified?: string;
  description?: string;
  quantization?: string;  // e.g., Q4_K_M, Q8_0
  parameters?: string;    // e.g., 7B, 13B
}

export interface HuggingFaceModel {
  _id: string;
  id: string;  // repo id like "TheBloke/Llama-2-7B-GGUF"
  modelId: string;
  author?: string;
  downloads: number;
  likes: number;
  tags: string[];
  lastModified: string;
  private: boolean;
  siblings?: HuggingFaceFile[];
}

export interface HuggingFaceFile {
  rfilename: string;
  size?: number;
  blobId?: string;
  lfs?: {
    size: number;
    sha256: string;
    pointerSize: number;
  };
}

export interface DownloadProgress {
  modelId: string;
  filename: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'downloading' | 'complete' | 'error';
  error?: string;
}

// Quantization quality rankings (higher = better quality, larger size)
export const QUANTIZATION_RANKS: Record<string, number> = {
  'F32': 100,
  'F16': 95,
  'BF16': 94,
  'Q8_0': 90,
  'Q8_1': 89,
  'Q6_K': 80,
  'Q5_K_M': 70,
  'Q5_K_S': 68,
  'Q5_1': 67,
  'Q5_0': 66,
  'Q4_K_M': 60,
  'Q4_K_S': 58,
  'Q4_1': 57,
  'Q4_0': 56,
  'Q3_K_M': 50,
  'Q3_K_S': 48,
  'Q2_K': 40,
  'IQ4_XS': 55,
  'IQ3_XS': 45,
  'IQ2_XS': 35,
};

// Helper to detect format from filename
export function detectFormat(filename: string): ModelFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.gguf')) return 'gguf';
  if (lower.endsWith('.safetensors')) return 'safetensors';
  if (lower.endsWith('.bin') || lower.endsWith('.pt') || lower.endsWith('.pth')) return 'pytorch';
  if (lower.includes('mlx')) return 'mlx';
  return 'unknown';
}

// Helper to extract quantization from filename
export function extractQuantization(filename: string): string | undefined {
  // Match patterns like Q4_K_M, Q8_0, IQ4_XS, etc.
  const match = filename.match(/[QI][0-9]+_?[A-Z0-9_]*/i);
  return match ? match[0].toUpperCase() : undefined;
}

// Helper to extract parameter count from filename/name
export function extractParameters(name: string): string | undefined {
  // Match patterns like 7B, 13B, 70B, 1.5B, etc.
  const match = name.match(/(\d+\.?\d*)[Bb]/);
  return match ? `${match[1]}B` : undefined;
}

// Format bytes to human-readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
