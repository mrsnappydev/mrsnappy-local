// Model Import Utilities for MrSnappy Local
// Import models from central storage to Ollama and LM Studio

import { promises as fs, constants as fsConstants } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir, platform, hostname } from 'os';
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
  ollamaUrl?: string;  // URL of the Ollama server
  trustedNetworks?: string[];  // IP prefixes/suffixes considered "local" (for Tailscale/VPN)
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

// Default trusted network prefixes (can be overridden via settings)
const DEFAULT_TRUSTED_NETWORKS = [
  '100.',        // Tailscale CGNAT range
  '10.',         // Private network Class A
  '192.168.',    // Private network Class C
  '172.16.', '172.17.', '172.18.', '172.19.', '172.20.',
  '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
  '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '.local',      // mDNS local domains
  '.tail',       // Tailscale MagicDNS suffix
  '.ts.net',     // Tailscale MagicDNS
];

/**
 * Check if a hostname/IP is considered "local" or trusted
 * Includes localhost, private networks, and Tailscale ranges
 */
export function isHostTrusted(host: string, trustedNetworks?: string[]): boolean {
  const lowerHost = host.toLowerCase();
  
  // Always trust actual localhost
  if (lowerHost === 'localhost' || lowerHost === '127.0.0.1' || lowerHost === '::1') {
    return true;
  }
  
  // Check against trusted networks
  const networks = trustedNetworks || DEFAULT_TRUSTED_NETWORKS;
  for (const prefix of networks) {
    if (lowerHost.startsWith(prefix) || lowerHost.endsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if Ollama URL is considered local/trusted
 * Includes localhost, private networks, and Tailscale ranges by default
 */
export function isOllamaLocal(ollamaUrl?: string, trustedNetworks?: string[]): boolean {
  const url = ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
  try {
    const parsedUrl = new URL(url);
    return isHostTrusted(parsedUrl.hostname, trustedNetworks);
  } catch {
    return true; // Assume local if URL parsing fails
  }
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
 * Check if a file exists and is accessible
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists and is writable
 */
async function isDirectoryWritable(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fsConstants.W_OK);
    return true;
  } catch {
    // Try to create it
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get a directory where we can copy models that Ollama can access
 * Uses a shared location that both MrSnappy and Ollama can read/write
 */
async function getSharedModelsPath(): Promise<string> {
  const home = homedir();
  const plat = platform();
  
  // Check for OLLAMA_MODELS env var first
  if (process.env.OLLAMA_MODELS) {
    return process.env.OLLAMA_MODELS;
  }
  
  // List of paths to try, in order of preference
  // Prioritize world-accessible locations that both MrSnappy and Ollama can use
  let pathsToTry: string[] = [];
  
  switch (plat) {
    case 'darwin':  // macOS
      pathsToTry = [
        '/usr/local/share/mrsnappy-models',  // Shared location
        join(home, '.ollama', 'models'),
      ];
      break;
    case 'win32':   // Windows
      pathsToTry = [
        'C:\\ProgramData\\MrSnappy\\models',  // Shared location on Windows
        join(home, '.ollama', 'models'),
        join(home, 'AppData', 'Local', 'Ollama', 'models'),
      ];
      break;
    case 'linux':
      // On Linux, use /var/tmp which is NOT affected by systemd PrivateTmp
      // /tmp won't work because systemd services have their own private /tmp
      pathsToTry = [
        '/var/tmp/mrsnappy-models',           // NOT affected by PrivateTmp - this should work!
        '/var/lib/mrsnappy/models',           // Proper Linux shared location (needs sudo to create)
        '/usr/share/ollama/.ollama/models',   // systemd Ollama location
        join(home, '.ollama', 'models'),      // user's Ollama
      ];
      break;
    default:
      pathsToTry = [
        '/var/tmp/mrsnappy-models',
        join(home, '.ollama', 'models'),
      ];
  }
  
  // Try each path and return the first writable one
  for (const pathToTry of pathsToTry) {
    console.log(`[Import] Checking shared path: ${pathToTry}`);
    if (await isDirectoryWritable(pathToTry)) {
      console.log(`[Import] Using shared path: ${pathToTry}`);
      
      // Make directory world-readable so Ollama can access it
      try {
        await fs.chmod(pathToTry, 0o755);
      } catch {
        // Non-fatal
      }
      
      return pathToTry;
    }
  }
  
  // Last resort: /var/tmp is NOT affected by systemd PrivateTmp
  const fallbackPath = '/var/tmp/mrsnappy-models';
  console.log(`[Import] Falling back to: ${fallbackPath}`);
  try {
    await fs.mkdir(fallbackPath, { recursive: true });
    await fs.chmod(fallbackPath, 0o777);  // World writable
  } catch (e) {
    console.log(`[Import] Could not create fallback path: ${e}`);
  }
  return fallbackPath;
}

/**
 * Copy model file to a shared directory that Ollama can access
 * Returns the new path where the file was copied
 */
async function copyModelToOllamaDir(sourcePath: string, filename: string): Promise<string> {
  const sharedModelsPath = await getSharedModelsPath();
  const mrsnappyDir = join(sharedModelsPath, 'mrsnappy-imports');
  
  // Ensure directory exists
  await fs.mkdir(mrsnappyDir, { recursive: true });
  
  const targetPath = join(mrsnappyDir, filename);
  
  // Check if already copied
  try {
    const sourceStats = await fs.stat(sourcePath);
    const targetStats = await fs.stat(targetPath);
    
    // If target exists and same size, assume it's the same file
    if (targetStats.size === sourceStats.size) {
      console.log(`[Import] Model already copied to ${targetPath}`);
      return targetPath;
    }
  } catch {
    // Target doesn't exist, continue with copy
  }
  
  console.log(`[Import] Copying model to shared directory: ${targetPath}`);
  console.log(`[Import] Source: ${sourcePath}`);
  console.log(`[Import] This may take a while for large models...`);
  
  await fs.copyFile(sourcePath, targetPath);
  
  // Make the file readable by all users (for Ollama running as different user)
  try {
    await fs.chmod(targetPath, 0o644);  // rw-r--r--
    console.log(`[Import] Set file permissions to 644 (world-readable)`);
  } catch (chmodError) {
    console.log(`[Import] Could not set permissions (non-fatal): ${chmodError}`);
  }
  
  // Verify the file exists and is readable
  try {
    const stats = await fs.stat(targetPath);
    console.log(`[Import] Copy complete: ${targetPath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
  } catch (e) {
    console.log(`[Import] Warning: Could not verify copied file: ${e}`);
  }
  
  return targetPath;
}

/**
 * Import a model to Ollama
 */
export async function importToOllama(
  model: StoredModel,
  options: OllamaImportOptions = {}
): Promise<ImportResult> {
  const modelName = options.modelName || generateModelName(model.filename);
  const ollamaUrl = options.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
  
  try {
    // Check if model file exists
    if (!await fileExists(model.path)) {
      return {
        success: false,
        modelId: model.id,
        provider: 'ollama',
        error: `Model file not found: ${model.path}`,
      };
    }
    
    // Check if Ollama is on a trusted network (localhost, LAN, Tailscale, etc.)
    // If Ollama is truly remote (public internet), it won't be able to access the local file path
    if (!isOllamaLocal(ollamaUrl, options.trustedNetworks)) {
      return {
        success: false,
        modelId: model.id,
        provider: 'ollama',
        error: `Cannot import to remote Ollama server at ${ollamaUrl}. The model file is stored on this server. ` +
               `If Ollama is on your local network or Tailscale, check Settings → Network to add it as a trusted network.`,
      };
    }
    
    // Try import with original path first
    let modelPath = model.path;
    let usedCopy = false;
    
    // Create Modelfile content
    let modelfile = createModelfile(modelPath, options);
    
    console.log(`[Import] Creating Ollama model "${modelName}" from ${modelPath}`);
    console.log(`[Import] Modelfile content:\n${modelfile}`);
    
    // Use Ollama API to create model
    let response = await fetch(`${ollamaUrl}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: modelName,
        modelfile: modelfile,
        stream: false,
      }),
    });
    
    // Check if failed due to path access issue
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      
      const errorMsg = errorJson.error || errorText;
      
      // If it's a path access error, try to fix permissions first, then copy as fallback
      if (errorMsg.includes("neither 'from' or 'files'") || 
          errorMsg.includes("no such file") ||
          errorMsg.includes("permission denied")) {
        
        console.log(`[Import] Path not accessible by Ollama, trying to fix permissions...`);
        
        // First, try to make the original file and ALL parent directories accessible
        try {
          const modelDir = dirname(model.path);
          
          // Make ALL parent directories traversable (need +x on each)
          // Walk up the path and ensure each directory has at least 711 (rwx--x--x)
          const pathParts = model.path.split('/').filter(Boolean);
          let currentPath = '';
          for (let i = 0; i < pathParts.length - 1; i++) { // -1 to skip the filename
            currentPath += '/' + pathParts[i];
            try {
              const stats = await fs.stat(currentPath);
              const currentMode = stats.mode & 0o777;
              // If directory doesn't have world-execute, add it (allows traversal)
              if ((currentMode & 0o001) === 0) {
                const newMode = currentMode | 0o011; // Add group+other execute
                await fs.chmod(currentPath, newMode);
                console.log(`[Import] Added traverse permission to: ${currentPath} (${currentMode.toString(8)} -> ${newMode.toString(8)})`);
              }
            } catch (e) {
              console.log(`[Import] Could not check/fix permissions on ${currentPath}: ${e}`);
            }
          }
          
          // Make model directory accessible (755 = rwxr-xr-x)
          await fs.chmod(modelDir, 0o755);
          console.log(`[Import] Set directory permissions to 755: ${modelDir}`);
          
          // Make file readable (644 = rw-r--r--)
          await fs.chmod(model.path, 0o644);
          console.log(`[Import] Set file permissions to 644: ${model.path}`);
          
          // Retry with original path
          console.log(`[Import] Retrying with original path after permission fix...`);
          response = await fetch(`${ollamaUrl}/api/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: modelName,
              modelfile: modelfile,
              stream: false,
            }),
          });
          
          // If that worked, we're done
          if (response.ok) {
            console.log(`[Import] Permission fix worked!`);
          }
        } catch (chmodError) {
          console.log(`[Import] Could not fix permissions: ${chmodError}`);
        }
        
        // If still failing, try copying as fallback
        if (!response.ok) {
          console.log(`[Import] Permission fix didn't help, trying to copy...`);
          
          try {
            // Copy model to shared directory
            modelPath = await copyModelToOllamaDir(model.path, model.filename);
            usedCopy = true;
            
            // Retry with new path
            modelfile = createModelfile(modelPath, options);
            console.log(`[Import] Retrying with copied path: ${modelPath}`);
            
            response = await fetch(`${ollamaUrl}/api/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: modelName,
                modelfile: modelfile,
                stream: false,
              }),
            });
          } catch (copyError) {
            console.error('[Import] Failed to copy model:', copyError);
            return {
              success: false,
              modelId: model.id,
              provider: 'ollama',
              error: `Ollama cannot access the model file. Tried:\n` +
                     `1. Making file world-readable (may need: chmod 644 "${model.path}")\n` +
                     `2. Copying to shared location (failed: ${copyError instanceof Error ? copyError.message : 'Unknown error'})\n\n` +
                     `Fix: Run this command to make your models readable by Ollama:\n` +
                     `chmod -R a+rX ~/MrSnappy-Models`,
            };
          }
        }
      }
    }
    
    // Final check on response
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      
      throw new Error(errorJson.error || errorText);
    }
    
    // Check response for any errors
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    
    console.log(`[Import] Successfully created Ollama model: ${modelName}${usedCopy ? ' (using copied file)' : ''}`);
    
    // Update registry
    await updateModelImport(model.id, 'ollama', true, modelName);
    
    return {
      success: true,
      modelId: model.id,
      provider: 'ollama',
      importedName: modelName,
    };
    
  } catch (error) {
    console.error('[Import] Ollama import failed:', error);
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
    // Check if model file exists
    if (!await fileExists(model.path)) {
      return {
        success: false,
        modelId: model.id,
        provider: 'lmstudio',
        error: `Model file not found: ${model.path}`,
      };
    }
    
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
export async function isOllamaRunning(ollamaUrl?: string): Promise<boolean> {
  try {
    const url = ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${url}/api/tags`, {
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
export async function getOllamaModels(ollamaUrl?: string): Promise<string[]> {
  try {
    const url = ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${url}/api/tags`);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

/**
 * Get deployment info for diagnostics
 */
export function getDeploymentInfo(): {
  hostname: string;
  platform: string;
  isNetworkDeployment: boolean;
} {
  return {
    hostname: hostname(),
    platform: platform(),
    isNetworkDeployment: false, // This would need to be determined by comparing request origin
  };
}
