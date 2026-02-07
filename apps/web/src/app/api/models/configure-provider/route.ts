// API Route: Configure Providers to Use Central Storage
// POST: Set up Ollama or LM Studio to use central model storage

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';
import { getStoragePath, ensureStorageDirectory } from '@/lib/models/storage';
import { getDefaultProviderPaths } from '@/lib/models/detect';

interface ConfigureRequest {
  provider: 'ollama' | 'lmstudio';
  action: 'configure' | 'status' | 'restore';
  createBackup?: boolean;  // Backup existing config/directory
}

interface ProviderConfigStatus {
  provider: 'ollama' | 'lmstudio';
  configured: boolean;
  usingCentralStorage: boolean;
  currentPath: string;
  centralStoragePath: string;
  symlinkExists: boolean;
  backupExists: boolean;
  backupPath?: string;
  envVarSet?: boolean;  // For Ollama
  instructions?: string[];
}

interface ConfigureResponse {
  success: boolean;
  provider: 'ollama' | 'lmstudio';
  status: ProviderConfigStatus;
  error?: string;
  message?: string;
}

/**
 * Get the Ollama models path
 */
function getOllamaModelsPath(): string {
  return join(homedir(), '.ollama', 'models');
}

/**
 * Get the LM Studio models path based on platform
 */
function getLMStudioModelsPath(): string {
  const plat = platform();
  
  switch (plat) {
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'LM Studio', 'models');
    case 'win32':
    case 'linux':
    default:
      return join(homedir(), '.cache', 'lm-studio', 'models');
  }
}

/**
 * Check if a path is a symlink pointing to target
 */
async function isSymlinkTo(path: string, target: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(path);
    if (!stat.isSymbolicLink()) return false;
    
    const linkTarget = await fs.readlink(path);
    return linkTarget === target;
  } catch {
    return false;
  }
}

/**
 * Check if OLLAMA_MODELS env var is set (for information purposes)
 */
function checkOllamaEnvVar(): boolean {
  return !!process.env.OLLAMA_MODELS;
}

/**
 * Get status of provider configuration
 */
async function getProviderStatus(provider: 'ollama' | 'lmstudio'): Promise<ProviderConfigStatus> {
  const centralPath = getStoragePath();
  const providerPath = provider === 'ollama' ? getOllamaModelsPath() : getLMStudioModelsPath();
  const backupPath = `${providerPath}.backup`;
  
  let symlinkExists = false;
  let usingCentralStorage = false;
  let currentPath = providerPath;
  let backupExists = false;
  
  try {
    const stat = await fs.lstat(providerPath);
    
    if (stat.isSymbolicLink()) {
      symlinkExists = true;
      const linkTarget = await fs.readlink(providerPath);
      currentPath = linkTarget;
      usingCentralStorage = linkTarget === centralPath;
    }
  } catch {
    // Path doesn't exist
  }
  
  try {
    await fs.access(backupPath);
    backupExists = true;
  } catch {
    // No backup
  }
  
  const status: ProviderConfigStatus = {
    provider,
    configured: usingCentralStorage,
    usingCentralStorage,
    currentPath,
    centralStoragePath: centralPath,
    symlinkExists,
    backupExists,
    backupPath: backupExists ? backupPath : undefined,
  };
  
  if (provider === 'ollama') {
    status.envVarSet = checkOllamaEnvVar();
    status.instructions = [
      'Option 1: Set environment variable (recommended)',
      '  export OLLAMA_MODELS=' + centralPath,
      '  Add this to ~/.bashrc, ~/.zshrc, or system environment',
      '',
      'Option 2: Create symlink (automatic)',
      '  This will move your existing models and create a symlink',
      '',
      'Note: Restart Ollama after configuration changes',
    ];
  } else {
    status.instructions = [
      'LM Studio can load models from any folder.',
      'Option 1: Set models folder in LM Studio preferences',
      '  Open LM Studio → Preferences → Models folder',
      '  Set to: ' + centralPath,
      '',
      'Option 2: Create symlink (automatic)',
      '  This will move your existing models and create a symlink',
    ];
  }
  
  return status;
}

/**
 * Configure a provider to use central storage via symlink
 */
async function configureProvider(
  provider: 'ollama' | 'lmstudio',
  createBackup: boolean = true
): Promise<{ success: boolean; message?: string; error?: string }> {
  const centralPath = await ensureStorageDirectory();
  const providerPath = provider === 'ollama' ? getOllamaModelsPath() : getLMStudioModelsPath();
  const backupPath = `${providerPath}.backup`;
  
  try {
    // Check if already configured
    const isLinked = await isSymlinkTo(providerPath, centralPath);
    if (isLinked) {
      return { success: true, message: 'Already configured to use central storage' };
    }
    
    // Check if provider path exists
    let providerPathExists = false;
    let isSymlink = false;
    
    try {
      const stat = await fs.lstat(providerPath);
      providerPathExists = true;
      isSymlink = stat.isSymbolicLink();
    } catch {
      // Doesn't exist
    }
    
    if (providerPathExists) {
      if (isSymlink) {
        // Remove existing symlink
        await fs.unlink(providerPath);
      } else {
        // It's a regular directory - backup and remove
        if (createBackup) {
          // Check if backup already exists
          try {
            await fs.access(backupPath);
            return { 
              success: false, 
              error: `Backup already exists at ${backupPath}. Remove it first or skip backup.` 
            };
          } catch {
            // No backup, proceed
          }
          
          // Rename to backup
          await fs.rename(providerPath, backupPath);
        } else {
          // Just remove (dangerous!)
          return {
            success: false,
            error: 'Cannot remove existing directory without backup. Set createBackup=true.',
          };
        }
      }
    }
    
    // Ensure parent directory exists
    await fs.mkdir(dirname(providerPath), { recursive: true });
    
    // Create symlink
    await fs.symlink(centralPath, providerPath);
    
    return {
      success: true,
      message: `Created symlink: ${providerPath} → ${centralPath}${createBackup ? `\nBackup saved to: ${backupPath}` : ''}`,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Restore provider to use its original directory
 */
async function restoreProvider(
  provider: 'ollama' | 'lmstudio'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const providerPath = provider === 'ollama' ? getOllamaModelsPath() : getLMStudioModelsPath();
  const backupPath = `${providerPath}.backup`;
  
  try {
    // Check if current path is a symlink
    let isSymlink = false;
    try {
      const stat = await fs.lstat(providerPath);
      isSymlink = stat.isSymbolicLink();
    } catch {
      // Doesn't exist
    }
    
    if (isSymlink) {
      // Remove symlink
      await fs.unlink(providerPath);
    }
    
    // Check if backup exists
    try {
      await fs.access(backupPath);
      // Restore backup
      await fs.rename(backupPath, providerPath);
      return {
        success: true,
        message: `Restored original models directory from backup`,
      };
    } catch {
      // No backup to restore
      return {
        success: true,
        message: 'Symlink removed. No backup to restore.',
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET /api/models/configure-provider
 * Get configuration status for providers
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') as 'ollama' | 'lmstudio' | null;
    
    if (provider) {
      const status = await getProviderStatus(provider);
      return NextResponse.json({ success: true, status });
    }
    
    // Return status for both providers
    const [ollama, lmstudio] = await Promise.all([
      getProviderStatus('ollama'),
      getProviderStatus('lmstudio'),
    ]);
    
    return NextResponse.json({
      success: true,
      providers: { ollama, lmstudio },
      centralStoragePath: getStoragePath(),
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/models/configure-provider
 * Configure a provider to use central storage
 */
export async function POST(request: NextRequest): Promise<NextResponse<ConfigureResponse>> {
  try {
    const body: ConfigureRequest = await request.json();
    const { provider, action, createBackup = true } = body;
    
    if (!provider || !action) {
      return NextResponse.json(
        { 
          success: false, 
          provider: provider || 'ollama',
          status: await getProviderStatus(provider || 'ollama'),
          error: 'Missing required fields: provider, action' 
        },
        { status: 400 }
      );
    }
    
    let result: { success: boolean; message?: string; error?: string };
    
    switch (action) {
      case 'configure':
        result = await configureProvider(provider, createBackup);
        break;
        
      case 'restore':
        result = await restoreProvider(provider);
        break;
        
      case 'status':
        // Just return status
        result = { success: true };
        break;
        
      default:
        return NextResponse.json(
          {
            success: false,
            provider,
            status: await getProviderStatus(provider),
            error: `Unknown action: ${action}`,
          },
          { status: 400 }
        );
    }
    
    const status = await getProviderStatus(provider);
    
    return NextResponse.json({
      success: result.success,
      provider,
      status,
      message: result.message,
      error: result.error,
    });
    
  } catch (error) {
    console.error('Configure provider error:', error);
    return NextResponse.json(
      { 
        success: false, 
        provider: 'ollama',
        status: {
          provider: 'ollama',
          configured: false,
          usingCentralStorage: false,
          currentPath: '',
          centralStoragePath: getStoragePath(),
          symlinkExists: false,
          backupExists: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
