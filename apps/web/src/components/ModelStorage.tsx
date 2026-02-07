'use client';

import { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  FolderOpen,
  Import,
  X,
  FolderSymlink,
  Settings,
} from 'lucide-react';
import { formatBytes } from '@/lib/models/types';
import ImportExistingModels from './ImportExistingModels';
import ConfigureProviderStorage from './ConfigureProviderStorage';

// Types for storage API responses
interface StoredModel {
  id: string;
  filename: string;
  path: string;
  size: number;
  format: string;
  quantization?: string;
  parameters?: string;
  downloadedAt: number;
  source: 'huggingface' | 'ollama' | 'lmstudio' | 'manual';
  sourceUrl?: string;
  hfRepo?: string;
  importedTo: ('ollama' | 'lmstudio')[];
  ollamaModelName?: string;
}

interface StorageStats {
  totalModels: number;
  totalSize: number;
  storagePath: string;
  storageExists: boolean;
  ollamaImported: number;
  lmstudioImported: number;
}

interface StorageResponse {
  models: StoredModel[];
  stats: StorageStats;
}

interface ProviderStatus {
  available: boolean;
  status: string;
}

interface ImportProvidersStatus {
  providers: {
    ollama: ProviderStatus;
    lmstudio: ProviderStatus;
  };
}

type StorageTab = 'models' | 'import' | 'configure';

interface ModelStorageProps {
  onRefreshNeeded?: () => void;
  initialTab?: StorageTab;
  onUseModel?: (modelId: string, provider: 'ollama' | 'lmstudio') => void;
}

export default function ModelStorage({ onRefreshNeeded, initialTab = 'models', onUseModel }: ModelStorageProps) {
  const [activeTab, setActiveTab] = useState<StorageTab>(initialTab);
  const [data, setData] = useState<StorageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ImportProvidersStatus | null>(null);
  const [importingModel, setImportingModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchStorage();
    fetchProviderStatus();
  }, []);

  const fetchStorage = async (scan = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (scan) params.set('scan', 'true');
      params.set('verify', 'true');

      const response = await fetch(`/api/models/storage?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch storage');

      const result: StorageResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setIsLoading(false);
  };

  const fetchProviderStatus = async () => {
    try {
      const response = await fetch('/api/models/import');
      if (response.ok) {
        const result: ImportProvidersStatus = await response.json();
        setProviderStatus(result);
      }
    } catch {
      // Ignore errors
    }
  };

  const handleImport = async (modelId: string, provider: 'ollama' | 'lmstudio') => {
    setImportingModel(`${modelId}-${provider}`);

    try {
      const response = await fetch('/api/models/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          provider,
          action: 'import',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Refresh storage to update import status
      await fetchStorage();
      onRefreshNeeded?.();
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    setImportingModel(null);
  };

  const handleRemoveFromProvider = async (modelId: string, provider: 'ollama' | 'lmstudio') => {
    setImportingModel(`${modelId}-${provider}`);

    try {
      const response = await fetch('/api/models/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          provider,
          action: 'remove',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Remove failed');
      }

      await fetchStorage();
      onRefreshNeeded?.();
    } catch (err) {
      alert(`Remove failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    setImportingModel(null);
  };

  const handleDelete = async (modelId: string, deleteFile: boolean) => {
    setDeletingModel(modelId);
    setConfirmDelete(null);

    try {
      const response = await fetch(
        `/api/models/storage/${modelId}?deleteFile=${deleteFile}&cleanupProviders=true`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      await fetchStorage();
      onRefreshNeeded?.();
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    setDeletingModel(null);
  };

  // Handle "Use Model" - import if needed, then select it
  const handleUseModel = async (model: StoredModel, provider: 'ollama' | 'lmstudio') => {
    // If not imported to this provider yet, import first
    if (!model.importedTo.includes(provider)) {
      setImportingModel(`${model.id}-${provider}`);
      
      try {
        const response = await fetch('/api/models/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: model.id,
            provider,
            action: 'import',
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Import failed');
        }
        
        await fetchStorage();
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setImportingModel(null);
        return;
      }
      
      setImportingModel(null);
    }
    
    // Now select the model for use
    const modelName = provider === 'ollama' 
      ? model.ollamaModelName || model.filename.replace('.gguf', '')
      : model.filename;
    
    onUseModel?.(modelName, provider);
  };

  // Handle import complete - refresh storage and switch to models tab
  const handleImportComplete = () => {
    fetchStorage(true);
    setActiveTab('models');
    onRefreshNeeded?.();
  };

  // Handle config change - refresh storage
  const handleConfigChange = () => {
    fetchStorage(true);
    onRefreshNeeded?.();
  };

  const stats = data?.stats;
  const models = data?.models || [];

  // Tab button component
  const TabButton = ({ tab, icon: Icon, label }: { tab: StorageTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        <TabButton tab="models" icon={HardDrive} label="Models" />
        <TabButton tab="import" icon={Import} label="Import Existing" />
        <TabButton tab="configure" icon={FolderSymlink} label="Configure Storage" />
      </div>

      {/* Import Existing Tab */}
      {activeTab === 'import' && (
        <ImportExistingModels onImportComplete={handleImportComplete} />
      )}

      {/* Configure Storage Tab */}
      {activeTab === 'configure' && (
        <ConfigureProviderStorage onConfigChange={handleConfigChange} />
      )}

      {/* Models Tab - Original Content */}
      {activeTab === 'models' && (
        <>
          {isLoading && !data ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-zinc-400">{error}</p>
              <button
                onClick={() => fetchStorage(true)}
                className="px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg font-medium hover:bg-amber-400"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
      {/* Storage Stats Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <HardDrive className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-200">Central Model Storage</h3>
            <p className="text-xs text-zinc-500 truncate max-w-md" title={stats?.storagePath}>
              {stats?.storagePath}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-200">
              {stats?.totalModels || 0} model{stats?.totalModels !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-zinc-500">{formatBytes(stats?.totalSize || 0)} total</p>
          </div>
          <button
            onClick={() => fetchStorage(true)}
            disabled={isLoading}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Refresh & scan for new models"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Provider Status */}
      {providerStatus && (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg text-sm">
          <span className="text-zinc-400">Import to:</span>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded ${
              providerStatus.providers.ollama.available
                ? 'bg-green-500/10 text-green-400'
                : 'bg-zinc-700/50 text-zinc-500'
            }`}
          >
            🦙 Ollama
            {providerStatus.providers.ollama.available ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <span className="text-xs">(offline)</span>
            )}
          </div>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded ${
              providerStatus.providers.lmstudio.available
                ? 'bg-green-500/10 text-green-400'
                : 'bg-zinc-700/50 text-zinc-500'
            }`}
          >
            🎛️ LM Studio
            {providerStatus.providers.lmstudio.available ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <span className="text-xs">(unavailable)</span>
            )}
          </div>
        </div>
      )}

      {/* Model List */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HardDrive className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No models in central storage</p>
          <p className="text-sm text-zinc-500">
            Download models from Huggingface to store them here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Model name and metadata */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-zinc-100 truncate">
                      {model.filename.replace('.gguf', '')}
                    </span>
                    {model.parameters && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                        {model.parameters}
                      </span>
                    )}
                    {model.quantization && (
                      <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                        {model.quantization}
                      </span>
                    )}
                  </div>

                  {/* Source and size */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{formatBytes(model.size)}</span>
                    <span>•</span>
                    <span className="capitalize">{model.source}</span>
                    {model.hfRepo && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{model.hfRepo}</span>
                      </>
                    )}
                  </div>

                  {/* Import status */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Use with Ollama button */}
                    {onUseModel && providerStatus?.providers.ollama.available && (
                      <button
                        onClick={() => handleUseModel(model, 'ollama')}
                        disabled={importingModel === `${model.id}-ollama`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500 text-zinc-900 rounded font-medium hover:bg-amber-400 disabled:opacity-50 transition-colors"
                      >
                        {importingModel === `${model.id}-ollama` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>🦙 Use with Ollama</>
                        )}
                      </button>
                    )}
                    
                    {/* Use with LM Studio button */}
                    {onUseModel && providerStatus?.providers.lmstudio.available && (
                      <button
                        onClick={() => handleUseModel(model, 'lmstudio')}
                        disabled={importingModel === `${model.id}-lmstudio`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500 text-zinc-900 rounded font-medium hover:bg-amber-400 disabled:opacity-50 transition-colors"
                      >
                        {importingModel === `${model.id}-lmstudio` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>🎛️ Use with LM Studio</>
                        )}
                      </button>
                    )}
                    
                    {/* Divider */}
                    {onUseModel && (providerStatus?.providers.ollama.available || providerStatus?.providers.lmstudio.available) && (
                      <span className="text-zinc-600">|</span>
                    )}
                    
                    {/* Ollama import status */}
                    {model.importedTo.includes('ollama') ? (
                      <button
                        onClick={() => handleRemoveFromProvider(model.id, 'ollama')}
                        disabled={importingModel === `${model.id}-ollama`}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                        title="Click to remove from Ollama"
                      >
                        {importingModel === `${model.id}-ollama` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        🦙 Imported
                      </button>
                    ) : (
                      <button
                        onClick={() => handleImport(model.id, 'ollama')}
                        disabled={
                          importingModel === `${model.id}-ollama` ||
                          !providerStatus?.providers.ollama.available
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Import to Ollama"
                      >
                        {importingModel === `${model.id}-ollama` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Import className="w-3 h-3" />
                        )}
                        🦙 Import
                      </button>
                    )}

                    {/* LM Studio import status */}
                    {model.importedTo.includes('lmstudio') ? (
                      <button
                        onClick={() => handleRemoveFromProvider(model.id, 'lmstudio')}
                        disabled={importingModel === `${model.id}-lmstudio`}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                        title="Click to remove from LM Studio"
                      >
                        {importingModel === `${model.id}-lmstudio` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        🎛️ Imported
                      </button>
                    ) : (
                      <button
                        onClick={() => handleImport(model.id, 'lmstudio')}
                        disabled={
                          importingModel === `${model.id}-lmstudio` ||
                          !providerStatus?.providers.lmstudio.available
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Import to LM Studio"
                      >
                        {importingModel === `${model.id}-lmstudio` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Import className="w-3 h-3" />
                        )}
                        🎛️ Import
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Delete button */}
                  {confirmDelete === model.id ? (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <span className="text-xs text-red-400">Delete file too?</span>
                      <button
                        onClick={() => handleDelete(model.id, true)}
                        disabled={deletingModel === model.id}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => handleDelete(model.id, false)}
                        disabled={deletingModel === model.id}
                        className="px-2 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-500"
                      >
                        Just unregister
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-1 hover:bg-zinc-700 rounded"
                      >
                        <X className="w-3 h-3 text-zinc-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(model.id)}
                      disabled={deletingModel === model.id}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                      title="Delete model"
                    >
                      {deletingModel === model.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <HardDrive className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">
          <strong>Download once, use everywhere.</strong> Models in central storage can be imported
          to both Ollama and LM Studio. This saves disk space by avoiding duplicate downloads.
        </p>
      </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
