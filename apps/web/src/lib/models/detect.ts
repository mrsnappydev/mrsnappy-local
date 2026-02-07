// Detect Existing Models from Ollama and LM Studio
// Scan provider directories to find models that can be imported to central storage

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { homedir, platform } from 'os';
import { detectFormat, extractQuantization, extractParameters, ModelFormat } from './types';

// Default paths by OS for each provider - try multiple common locations
const OLLAMA_PATHS: Record<string, string[]> = {
  linux: [
    join(homedir(), '.ollama', 'models'),
    '/usr/share/ollama/.ollama/models',
    '/var/lib/ollama/models',
  ],
  darwin: [
    join(homedir(), '.ollama', 'models'),
  ],
  win32: [
    join(homedir(), '.ollama', 'models'),
    join(homedir(), 'AppData', 'Local', 'Ollama', 'models'),
  ],
};

const LMSTUDIO_PATHS: Record<string, string[]> = {
  linux: [
    join(homedir(), '.lmstudio', 'models'),
    join(homedir(), '.cache', 'lm-studio', 'models'),
    join(homedir(), '.local', 'share', 'lm-studio', 'models'),
    join(homedir(), 'LM Studio', 'models'),
  ],
  darwin: [
    join(homedir(), '.lmstudio', 'models'),
    join(homedir(), 'Library', 'Application Support', 'LM Studio', 'models'),
  ],
  win32: [
    join(homedir(), '.lmstudio', 'models'),
    join(homedir(), '.cache', 'lm-studio', 'models'),
    join(homedir(), 'AppData', 'Local', 'LM Studio', 'models'),
  ],
};

export interface ExistingModel {
  name: string;
  displayName: string;
  path: string;
  size: number;
  provider: 'ollama' | 'lmstudio';
  format: ModelFormat;
  quantization?: string;
  parameters?: string;
  lastModified: number;
  // Ollama specific
  ollamaManifest?: OllamaManifest;
  blobFiles?: string[];
}

export interface OllamaManifest {
  schemaVersion: number;
  mediaType: string;
  config: { digest: string; size: number };
  layers: OllamaLayer[];
}

export interface OllamaLayer {
  mediaType: string;
  digest: string;
  size: number;
}

export interface ProviderPaths {
  ollama: string;
  lmstudio: string;
}

export interface DetectionResult {
  provider: 'ollama' | 'lmstudio';
  path: string;
  exists: boolean;
  models: ExistingModel[];
  error?: string;
  totalSize: number;
  checkedPaths?: string[];  // Paths that were checked during detection
}

/**
 * Get all possible paths for providers on current platform
 */
export function getAllProviderPaths(): { ollama: string[]; lmstudio: string[] } {
  const plat = platform();
  return {
    ollama: OLLAMA_PATHS[plat] || OLLAMA_PATHS.linux,
    lmstudio: LMSTUDIO_PATHS[plat] || LMSTUDIO_PATHS.linux,
  };
}

/**
 * Find the first existing path from a list
 */
async function findExistingPath(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    if (await directoryExists(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Get default paths for providers on current platform (first valid ones)
 */
export function getDefaultProviderPaths(): ProviderPaths {
  const all = getAllProviderPaths();
  return {
    ollama: all.ollama[0],
    lmstudio: all.lmstudio[0],
  };
}

/**
 * Check if a directory exists
 */
async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Recursively find all GGUF files in a directory
 */
async function findGGUFFiles(dir: string, results: { path: string; stat: any }[] = []): Promise<{ path: string; stat: any }[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules-like patterns
        if (!entry.name.startsWith('.') && entry.name !== 'blobs') {
          await findGGUFFiles(fullPath, results);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf')) {
        try {
          const stat = await fs.stat(fullPath);
          results.push({ path: fullPath, stat });
        } catch {
          // Skip files we can't stat
        }
      }
    }
  } catch (error) {
    // Directory might not be accessible
  }
  
  return results;
}

/**
 * Parse Ollama manifest file
 */
async function parseOllamaManifest(manifestPath: string): Promise<OllamaManifest | null> {
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get total size of Ollama model from manifest layers
 */
function getOllamaModelSize(manifest: OllamaManifest): number {
  return manifest.layers.reduce((sum, layer) => sum + layer.size, 0) + manifest.config.size;
}

/**
 * Detect Ollama models
 * 
 * Ollama stores models as:
 * ~/.ollama/models/
 *   manifests/
 *     registry.ollama.ai/
 *       library/
 *         <model-name>/
 *           <tag> (manifest JSON file)
 *   blobs/
 *     sha256-<hash> (actual model data)
 */
export async function detectOllamaModels(customPath?: string): Promise<DetectionResult> {
  const allPaths = getAllProviderPaths();
  
  // If custom path, use that; otherwise find first existing path
  let ollamaPath: string;
  let checkedPaths: string[] = [];
  
  if (customPath) {
    ollamaPath = customPath;
  } else {
    const foundPath = await findExistingPath(allPaths.ollama);
    checkedPaths = allPaths.ollama;
    ollamaPath = foundPath || allPaths.ollama[0];
  }
  
  const result: DetectionResult = {
    provider: 'ollama',
    path: ollamaPath,
    exists: false,
    models: [],
    totalSize: 0,
    checkedPaths,
  };
  
  if (!(await directoryExists(ollamaPath))) {
    result.error = `Ollama models directory not found. Checked: ${checkedPaths.join(', ') || ollamaPath}`;
    return result;
  }
  
  result.exists = true;
  
  try {
    const manifestsPath = join(ollamaPath, 'manifests');
    const blobsPath = join(ollamaPath, 'blobs');
    
    if (!(await directoryExists(manifestsPath))) {
      result.error = 'No manifests directory found';
      return result;
    }
    
    // Walk through manifests directory structure
    // Structure: manifests/registry.ollama.ai/library/<model>/<tag>
    const registries = await fs.readdir(manifestsPath).catch(() => []);
    
    for (const registry of registries) {
      const registryPath = join(manifestsPath, registry);
      if (!(await directoryExists(registryPath))) continue;
      
      const libraries = await fs.readdir(registryPath).catch(() => []);
      
      for (const library of libraries) {
        const libraryPath = join(registryPath, library);
        if (!(await directoryExists(libraryPath))) continue;
        
        const modelNames = await fs.readdir(libraryPath).catch(() => []);
        
        for (const modelName of modelNames) {
          const modelPath = join(libraryPath, modelName);
          if (!(await directoryExists(modelPath))) continue;
          
          const tags = await fs.readdir(modelPath).catch(() => []);
          
          for (const tag of tags) {
            const manifestFile = join(modelPath, tag);
            const manifest = await parseOllamaManifest(manifestFile);
            
            if (!manifest) continue;
            
            // Get the model layer (the actual GGUF data)
            const modelLayer = manifest.layers.find(l => 
              l.mediaType === 'application/vnd.ollama.image.model'
            );
            
            if (!modelLayer) continue;
            
            const size = getOllamaModelSize(manifest);
            const fullName = tag === 'latest' ? modelName : `${modelName}:${tag}`;
            
            // Get blob paths for this model
            const blobFiles = manifest.layers.map(l => {
              const digest = l.digest.replace('sha256:', 'sha256-');
              return join(blobsPath, digest);
            });
            
            // Add config blob
            const configDigest = manifest.config.digest.replace('sha256:', 'sha256-');
            blobFiles.push(join(blobsPath, configDigest));
            
            const existingModel: ExistingModel = {
              name: fullName,
              displayName: fullName,
              path: manifestFile,
              size,
              provider: 'ollama',
              format: 'gguf', // Ollama uses GGUF internally
              quantization: extractQuantization(modelName) || extractQuantization(tag),
              parameters: extractParameters(modelName) || extractParameters(tag),
              lastModified: Date.now(), // Could read from manifest file stat
              ollamaManifest: manifest,
              blobFiles,
            };
            
            result.models.push(existingModel);
            result.totalSize += size;
          }
        }
      }
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error scanning Ollama';
  }
  
  return result;
}

/**
 * Detect LM Studio models
 * 
 * LM Studio stores GGUF files directly:
 * ~/.cache/lm-studio/models/
 *   <publisher>/
 *     <model-name>/
 *       <file>.gguf
 */
export async function detectLMStudioModels(customPath?: string): Promise<DetectionResult> {
  const allPaths = getAllProviderPaths();
  
  // If custom path, use that; otherwise find first existing path
  let lmstudioPath: string;
  let checkedPaths: string[] = [];
  
  if (customPath) {
    lmstudioPath = customPath;
  } else {
    const foundPath = await findExistingPath(allPaths.lmstudio);
    checkedPaths = allPaths.lmstudio;
    lmstudioPath = foundPath || allPaths.lmstudio[0];
  }
  
  const result: DetectionResult = {
    provider: 'lmstudio',
    path: lmstudioPath,
    exists: false,
    models: [],
    totalSize: 0,
    checkedPaths,
  };
  
  if (!(await directoryExists(lmstudioPath))) {
    result.error = `LM Studio models directory not found. Checked: ${checkedPaths.join(', ') || lmstudioPath}`;
    return result;
  }
  
  result.exists = true;
  
  try {
    // Find all GGUF files recursively
    const ggufFiles = await findGGUFFiles(lmstudioPath);
    
    for (const { path: filePath, stat } of ggufFiles) {
      const filename = basename(filePath);
      
      // Skip our own symlinks from previous imports
      const relativePath = filePath.replace(lmstudioPath, '');
      if (relativePath.includes('mrsnappy-local')) {
        continue;
      }
      
      // Check if it's a symlink (might point to central storage)
      let isSymlink = false;
      let symlinkTarget: string | null = null;
      try {
        const lstat = await fs.lstat(filePath);
        if (lstat.isSymbolicLink()) {
          isSymlink = true;
          symlinkTarget = await fs.readlink(filePath);
        }
      } catch {
        // Not a symlink
      }
      
      // Skip symlinks pointing to our central storage
      if (symlinkTarget?.includes('MrSnappy-Models')) {
        continue;
      }
      
      // Extract model name from path
      // Usually: /path/to/models/publisher/model-name/file.gguf
      const parts = relativePath.split('/').filter(Boolean);
      let displayName = filename.replace('.gguf', '');
      
      if (parts.length >= 2) {
        // Use publisher/model format
        displayName = `${parts[parts.length - 2]}/${filename.replace('.gguf', '')}`;
      }
      
      const existingModel: ExistingModel = {
        name: filename,
        displayName,
        path: filePath,
        size: stat.size,
        provider: 'lmstudio',
        format: detectFormat(filename),
        quantization: extractQuantization(filename),
        parameters: extractParameters(filename),
        lastModified: stat.mtimeMs,
      };
      
      result.models.push(existingModel);
      result.totalSize += stat.size;
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error scanning LM Studio';
  }
  
  return result;
}

/**
 * Detect all existing models from both providers
 */
export async function detectAllExistingModels(): Promise<{
  ollama: DetectionResult;
  lmstudio: DetectionResult;
  combinedSize: number;
  totalModels: number;
}> {
  const [ollama, lmstudio] = await Promise.all([
    detectOllamaModels(),
    detectLMStudioModels(),
  ]);
  
  return {
    ollama,
    lmstudio,
    combinedSize: ollama.totalSize + lmstudio.totalSize,
    totalModels: ollama.models.length + lmstudio.models.length,
  };
}

/**
 * Get Ollama blob path from digest
 */
export function getOllamaBlobPath(ollamaPath: string, digest: string): string {
  const normalizedDigest = digest.replace('sha256:', 'sha256-');
  return join(ollamaPath, 'blobs', normalizedDigest);
}

/**
 * Export an Ollama model's GGUF blob to a file
 * Returns the path to the GGUF file within the blobs directory
 */
export async function getOllamaModelGGUFPath(model: ExistingModel): Promise<string | null> {
  if (!model.ollamaManifest) return null;
  
  // Find the model layer (the actual GGUF data)
  const modelLayer = model.ollamaManifest.layers.find(l => 
    l.mediaType === 'application/vnd.ollama.image.model'
  );
  
  if (!modelLayer) return null;
  
  // Return the blob path
  const ollamaPath = join(model.path, '..', '..', '..', '..', '..');
  return getOllamaBlobPath(ollamaPath, modelLayer.digest);
}
