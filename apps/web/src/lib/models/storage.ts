// Central Model Storage for MrSnappy Local
// Download once, use everywhere - models live in one place, providers reference them

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { detectFormat, extractQuantization, extractParameters, ModelFormat } from './types';

// Default storage location
const DEFAULT_STORAGE_PATH = join(homedir(), 'MrSnappy-Models');
const REGISTRY_FILENAME = '.registry.json';

export interface StoredModel {
  id: string;
  filename: string;
  path: string;
  size: number;
  format: ModelFormat;
  quantization?: string;
  parameters?: string;
  downloadedAt: number;
  source: 'huggingface' | 'ollama' | 'manual';
  sourceUrl?: string;
  hfRepo?: string;
  hfFile?: string;
  importedTo: ('ollama' | 'lmstudio')[];
  ollamaModelName?: string;  // Name used in Ollama after import
}

export interface StorageRegistry {
  version: number;
  storagePath: string;
  models: StoredModel[];
  lastUpdated: number;
}

export interface StorageStats {
  totalModels: number;
  totalSize: number;
  storagePath: string;
  storageExists: boolean;
  ollamaImported: number;
  lmstudioImported: number;
}

/**
 * Get the configured storage path
 */
export function getStoragePath(): string {
  return process.env.MODEL_STORAGE_PATH || DEFAULT_STORAGE_PATH;
}

/**
 * Ensure the storage directory exists
 */
export async function ensureStorageDirectory(): Promise<string> {
  const storagePath = getStoragePath();
  
  try {
    await fs.mkdir(storagePath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  return storagePath;
}

/**
 * Get the path to the registry file
 */
function getRegistryPath(): string {
  return join(getStoragePath(), REGISTRY_FILENAME);
}

/**
 * Load the model registry
 */
export async function loadRegistry(): Promise<StorageRegistry> {
  const registryPath = getRegistryPath();
  
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const registry: StorageRegistry = JSON.parse(content);
    return registry;
  } catch (error) {
    // Return empty registry if file doesn't exist
    return {
      version: 1,
      storagePath: getStoragePath(),
      models: [],
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Save the model registry
 */
export async function saveRegistry(registry: StorageRegistry): Promise<void> {
  await ensureStorageDirectory();
  const registryPath = getRegistryPath();
  
  registry.lastUpdated = Date.now();
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Generate a unique ID for a model
 */
export function generateModelId(filename: string, source: string): string {
  const baseName = basename(filename, '.gguf').toLowerCase();
  const sanitized = baseName.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  return `${sanitized}-${Date.now().toString(36)}`;
}

/**
 * Add a model to the registry
 */
export async function registerModel(model: Omit<StoredModel, 'id'>): Promise<StoredModel> {
  const registry = await loadRegistry();
  
  // Generate unique ID
  const id = generateModelId(model.filename, model.source);
  
  const storedModel: StoredModel = {
    ...model,
    id,
  };
  
  // Check if model with same path already exists
  const existingIndex = registry.models.findIndex(m => m.path === model.path);
  if (existingIndex >= 0) {
    // Update existing entry
    registry.models[existingIndex] = {
      ...registry.models[existingIndex],
      ...storedModel,
      id: registry.models[existingIndex].id, // Keep original ID
    };
    storedModel.id = registry.models[existingIndex].id;
  } else {
    registry.models.push(storedModel);
  }
  
  await saveRegistry(registry);
  return storedModel;
}

/**
 * Remove a model from the registry and optionally delete the file
 */
export async function removeModel(id: string, deleteFile: boolean = false): Promise<boolean> {
  const registry = await loadRegistry();
  
  const modelIndex = registry.models.findIndex(m => m.id === id);
  if (modelIndex < 0) {
    return false;
  }
  
  const model = registry.models[modelIndex];
  
  // Delete file if requested
  if (deleteFile) {
    try {
      await fs.unlink(model.path);
    } catch (error) {
      console.error(`Failed to delete model file: ${model.path}`, error);
    }
  }
  
  // Remove from registry
  registry.models.splice(modelIndex, 1);
  await saveRegistry(registry);
  
  return true;
}

/**
 * Get a model by ID
 */
export async function getModel(id: string): Promise<StoredModel | null> {
  const registry = await loadRegistry();
  return registry.models.find(m => m.id === id) || null;
}

/**
 * Get a model by filename
 */
export async function getModelByFilename(filename: string): Promise<StoredModel | null> {
  const registry = await loadRegistry();
  return registry.models.find(m => m.filename === filename) || null;
}

/**
 * Get all stored models
 */
export async function getAllModels(): Promise<StoredModel[]> {
  const registry = await loadRegistry();
  return registry.models;
}

/**
 * Update model's import status
 */
export async function updateModelImport(
  id: string, 
  provider: 'ollama' | 'lmstudio',
  imported: boolean,
  ollamaModelName?: string
): Promise<StoredModel | null> {
  const registry = await loadRegistry();
  
  const model = registry.models.find(m => m.id === id);
  if (!model) {
    return null;
  }
  
  if (imported) {
    if (!model.importedTo.includes(provider)) {
      model.importedTo.push(provider);
    }
    if (provider === 'ollama' && ollamaModelName) {
      model.ollamaModelName = ollamaModelName;
    }
  } else {
    model.importedTo = model.importedTo.filter(p => p !== provider);
    if (provider === 'ollama') {
      delete model.ollamaModelName;
    }
  }
  
  await saveRegistry(registry);
  return model;
}

/**
 * Scan storage directory for unregistered models
 */
export async function scanForNewModels(): Promise<StoredModel[]> {
  const storagePath = getStoragePath();
  const registry = await loadRegistry();
  const newModels: StoredModel[] = [];
  
  try {
    const files = await fs.readdir(storagePath);
    
    for (const filename of files) {
      // Skip non-GGUF files and registry
      if (!filename.endsWith('.gguf')) continue;
      
      const filePath = join(storagePath, filename);
      
      // Check if already registered
      if (registry.models.some(m => m.path === filePath)) {
        continue;
      }
      
      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Register the new model
      const model = await registerModel({
        filename,
        path: filePath,
        size: stats.size,
        format: detectFormat(filename),
        quantization: extractQuantization(filename),
        parameters: extractParameters(filename),
        downloadedAt: stats.mtimeMs,
        source: 'manual',
        importedTo: [],
      });
      
      newModels.push(model);
    }
  } catch (error) {
    console.error('Failed to scan storage directory:', error);
  }
  
  return newModels;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const storagePath = getStoragePath();
  const registry = await loadRegistry();
  
  let storageExists = false;
  try {
    await fs.access(storagePath);
    storageExists = true;
  } catch {
    storageExists = false;
  }
  
  const totalSize = registry.models.reduce((sum, m) => sum + m.size, 0);
  const ollamaImported = registry.models.filter(m => m.importedTo.includes('ollama')).length;
  const lmstudioImported = registry.models.filter(m => m.importedTo.includes('lmstudio')).length;
  
  return {
    totalModels: registry.models.length,
    totalSize,
    storagePath,
    storageExists,
    ollamaImported,
    lmstudioImported,
  };
}

/**
 * Verify that model files still exist and clean up missing ones
 */
export async function verifyModels(): Promise<{ valid: StoredModel[]; missing: StoredModel[] }> {
  const registry = await loadRegistry();
  const valid: StoredModel[] = [];
  const missing: StoredModel[] = [];
  
  for (const model of registry.models) {
    try {
      await fs.access(model.path);
      valid.push(model);
    } catch {
      missing.push(model);
    }
  }
  
  // Remove missing models from registry
  if (missing.length > 0) {
    registry.models = valid;
    await saveRegistry(registry);
  }
  
  return { valid, missing };
}

/**
 * Get the full path for a new model download
 */
export function getModelDownloadPath(filename: string): string {
  return join(getStoragePath(), filename);
}
