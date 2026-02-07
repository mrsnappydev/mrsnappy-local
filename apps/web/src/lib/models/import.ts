// Model Import Utilities for MrSnappy Local
// Import models from central storage to Ollama and LM Studio

import { promises as fs } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir, platform } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StoredModel, updateModelImport } from './storage';

const execAsync = promisify(exec);

export interface ImportResult {
  success: boolean;
  modelId: string;
  provider: 'ollama' | 'lmstudio';
  importedName?: string;
  error?: string;
}

export interface OllamaImportOptions {
  modelName?: string;  // Custom name for the model in Ollama
  systemPrompt?: string;  // Optional system prompt in Modelfile
  parameters?: Record<string, string | number>;  // Optional parameters
}

export interface LMStudioImportOptions {
  useSymlink?: boolean;  // Use symlink instead of copy (default: true)
}

/**
 * Get LM Studio models directory based on platform
 */
function getLMStudioModelsPath(): string {
  const home = homedir();
  const plat = platform();
  
  switch (plat) {
    case 'darwin':  // macOS
      return join(home, '.cache', 'lm-studio', 'models');
    case 'win32':   // Windows
      return join(home, '.cache', 'lm-studio', 'models');
    case 'linux':
      return join(home, '.cache', 'lm-studio', 'models');
    default:
      return join(home, '.cache', 'lm-studio', 'models');
  }
}

/**
 * Generate a clean model name from filename
 */
function generateModelName(filename: string): string {
  // Remove .gguf extension
  let name = basename(filename, '.gguf');
  
  // Replace special characters with hyphens
  name = name.replace(/[^a-zA-Z0-9-_.]/g, '-');
  
  // Remove multiple consecutive hyphens
  name = name.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  name = name.replace(/^-|-$/g, '');
  
  // Convert to lowercase for Ollama compatibility
  return name.toLowerCase();
}

/**
 * Create an Ollama Modelfile for a GGUF model
 */
function createModelfile(modelPath: string, options: OllamaImportOptions = {}): string {
  let modelfile = `# Modelfile created by MrSnappy Local
FROM ${modelPath}
`;

  if (options.systemPrompt) {
    modelfile += `\nSYSTEM """
${options.systemPrompt}
"""
`;
  }

  if (options.parameters) {
    for (const [key, value] of Object.entries(options.parameters)) {
      modelfile += `PARAMETER ${key} ${value}\n`;
    }
  }

  return modelfile;
}

/**
 * Import a model to Ollama
 */
export async function importToOllama(
  model: StoredModel,
  options: OllamaImportOptions = {}
): Promise<ImportResult> {
  const modelName = options.modelName || generateModelName(model.filename);
  
  try {
    // Create Modelfile content
    const modelfile = createModelfile(model.path, options);
    
    // Write temporary Modelfile
    const tempDir = join(dirname(model.path), '.temp');
    await fs.mkdir(tempDir, { recursive: true });
    const modelfilePath = join(tempDir, `Modelfile-${modelName}`);
    await fs.writeFile(modelfilePath, modelfile, 'utf-8');
    
    // Get Ollama URL from environment
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    // Use Ollama API to create model
    const response = await fetch(`${ollamaUrl}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: modelName,
        modelfile: modelfile,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama create failed: ${error}`);
    }
    
    // Clean up temp Modelfile
    try {
      await fs.unlink(modelfilePath);
      await fs.rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
    
    // Update registry
    await updateModelImport(model.id, 'ollama', true, modelName);
    
    return {
      success: true,
      modelId: model.id,
      provider: 'ollama',
      importedName: modelName,
    };
    
  } catch (error) {
    return {
      success: false,
      modelId: model.id,
      provider: 'ollama',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a model from Ollama
 */
export async function removeFromOllama(model: StoredModel): Promise<boolean> {
  if (!model.ollamaModelName) {
    return false;
  }
  
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    const response = await fetch(`${ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model.ollamaModelName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete from Ollama');
    }
    
    // Update registry
    await updateModelImport(model.id, 'ollama', false);
    return true;
    
  } catch (error) {
    console.error('Failed to remove from Ollama:', error);
    return false;
  }
}

/**
 * Import a model to LM Studio
 * LM Studio can load models from any path, but we can symlink for discoverability
 */
export async function importToLMStudio(
  model: StoredModel,
  options: LMStudioImportOptions = {}
): Promise<ImportResult> {
  const useSymlink = options.useSymlink !== false;  // Default to true
  
  try {
    const lmStudioPath = getLMStudioModelsPath();
    
    // Ensure LM Studio models directory exists
    await fs.mkdir(lmStudioPath, { recursive: true });
    
    // Create a subdirectory for MrSnappy models
    const mrsnappyDir = join(lmStudioPath, 'mrsnappy-local');
    await fs.mkdir(mrsnappyDir, { recursive: true });
    
    const targetPath = join(mrsnappyDir, model.filename);
    
    // Check if file already exists
    try {
      await fs.access(targetPath);
      // Already exists, check if it's the same file
      const targetStat = await fs.lstat(targetPath);
      if (targetStat.isSymbolicLink()) {
        const linkTarget = await fs.readlink(targetPath);
        if (linkTarget === model.path) {
          // Already linked correctly
          await updateModelImport(model.id, 'lmstudio', true);
          return {
            success: true,
            modelId: model.id,
            provider: 'lmstudio',
            importedName: targetPath,
          };
        }
        // Remove incorrect symlink
        await fs.unlink(targetPath);
      } else {
        // Regular file exists, skip or remove
        await fs.unlink(targetPath);
      }
    } catch {
      // File doesn't exist, continue
    }
    
    if (useSymlink) {
      // Create symlink
      await fs.symlink(model.path, targetPath);
    } else {
      // Copy file (not recommended for large files)
      await fs.copyFile(model.path, targetPath);
    }
    
    // Update registry
    await updateModelImport(model.id, 'lmstudio', true);
    
    return {
      success: true,
      modelId: model.id,
      provider: 'lmstudio',
      importedName: targetPath,
    };
    
  } catch (error) {
    return {
      success: false,
      modelId: model.id,
      provider: 'lmstudio',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a model from LM Studio (removes symlink/copy)
 */
export async function removeFromLMStudio(model: StoredModel): Promise<boolean> {
  try {
    const lmStudioPath = getLMStudioModelsPath();
    const mrsnappyDir = join(lmStudioPath, 'mrsnappy-local');
    const targetPath = join(mrsnappyDir, model.filename);
    
    await fs.unlink(targetPath);
    
    // Update registry
    await updateModelImport(model.id, 'lmstudio', false);
    return true;
    
  } catch (error) {
    console.error('Failed to remove from LM Studio:', error);
    return false;
  }
}

/**
 * Check if Ollama is running
 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if LM Studio models directory exists
 */
export async function isLMStudioAvailable(): Promise<boolean> {
  try {
    const lmStudioPath = getLMStudioModelsPath();
    await fs.access(lmStudioPath);
    return true;
  } catch {
    // Try to create it
    try {
      const lmStudioPath = getLMStudioModelsPath();
      await fs.mkdir(lmStudioPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get Ollama's model list to check what's already imported
 */
export async function getOllamaModels(): Promise<string[]> {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
