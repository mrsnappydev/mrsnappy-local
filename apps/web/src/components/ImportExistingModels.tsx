'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  FolderSearch,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  HardDrive,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Import,
} from 'lucide-react';
import { formatBytes } from '@/lib/models/types';

interface ExistingModel {
  name: string;
  displayName: string;
  path: string;
  size: number;
  provider: 'ollama' | 'lmstudio';
  format: string;
  quantization?: string;
  parameters?: string;
  lastModified: number;
  ollamaManifest?: any;
}

interface DetectionResult {
  provider: 'ollama' | 'lmstudio';
  path: string;
  exists: boolean;
  models: ExistingModel[];
  totalSize: number;
  notImported: number;
  error?: string;
}

interface DetectResponse {
  ollama: DetectionResult;
  lmstudio: DetectionResult;
  combinedSize: number;
  totalModels: number;
  notImportedTotal: number;
}

interface ImportExistingModelsProps {
  onImportComplete?: () => void;
}

export default function ImportExistingModels({ onImportComplete }: ImportExistingModelsProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<DetectResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    completed: number;
    current?: string;
    errors: string[];
  } | null>(null);
  const [expandedSection, setExpandedSection] = useState<'ollama' | 'lmstudio' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models/detect');
      if (!response.ok) {
        throw new Error('Failed to scan for models');
      }
      
      const data: DetectResponse = await response.json();
      setScanResults(data);
      
      // Auto-expand sections with models
      if (data.ollama.models.length > 0) {
        setExpandedSection('ollama');
      } else if (data.lmstudio.models.length > 0) {
        setExpandedSection('lmstudio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setIsScanning(false);
  };

  const toggleModel = (modelKey: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelKey)) {
      newSelected.delete(modelKey);
    } else {
      newSelected.add(modelKey);
    }
    setSelectedModels(newSelected);
  };

  const selectAll = (provider: 'ollama' | 'lmstudio') => {
    const models = provider === 'ollama' ? scanResults?.ollama.models : scanResults?.lmstudio.models;
    if (!models) return;
    
    const newSelected = new Set(selectedModels);
    models.forEach(m => newSelected.add(`${provider}:${m.path}`));
    setSelectedModels(newSelected);
  };

  const deselectAll = (provider: 'ollama' | 'lmstudio') => {
    const models = provider === 'ollama' ? scanResults?.ollama.models : scanResults?.lmstudio.models;
    if (!models) return;
    
    const newSelected = new Set(selectedModels);
    models.forEach(m => newSelected.delete(`${provider}:${m.path}`));
    setSelectedModels(newSelected);
  };

  const handleImportSelected = async () => {
    if (selectedModels.size === 0) return;
    
    const errors: string[] = [];
    let completed = 0;
    
    setImportProgress({
      total: selectedModels.size,
      completed: 0,
      errors: [],
    });
    
    for (const modelKey of selectedModels) {
      const [provider, ...pathParts] = modelKey.split(':');
      const path = pathParts.join(':'); // Handle paths with colons (Windows)
      
      // Find the model
      const models = provider === 'ollama' 
        ? scanResults?.ollama.models 
        : scanResults?.lmstudio.models;
      const model = models?.find(m => m.path === path);
      
      if (!model) {
        errors.push(`Model not found: ${path}`);
        completed++;
        setImportProgress({ total: selectedModels.size, completed, errors, current: undefined });
        continue;
      }
      
      setImportProgress({
        total: selectedModels.size,
        completed,
        current: model.displayName,
        errors,
      });
      
      setImporting(modelKey);
      
      try {
        const response = await fetch('/api/models/import-existing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePath: model.path,
            provider: model.provider,
            modelName: model.name,
            deleteOriginal: deleteOriginals,
            ollamaDigest: model.ollamaManifest?.layers?.find(
              (l: any) => l.mediaType === 'application/vnd.ollama.image.model'
            )?.digest,
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          errors.push(`${model.displayName}: ${result.error}`);
        }
      } catch (err) {
        errors.push(`${model.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      completed++;
      setImportProgress({ total: selectedModels.size, completed, errors, current: undefined });
    }
    
    setImporting(null);
    setSelectedModels(new Set());
    
    // Final progress update
    setImportProgress({ total: selectedModels.size, completed, errors, current: undefined });
    
    // Refresh scan results
    await handleScan();
    
    // Notify parent
    onImportComplete?.();
  };

  const getSelectedCount = (provider: 'ollama' | 'lmstudio'): number => {
    let count = 0;
    selectedModels.forEach(key => {
      if (key.startsWith(`${provider}:`)) count++;
    });
    return count;
  };

  const getSelectedSize = (): number => {
    let size = 0;
    selectedModels.forEach(key => {
      const [provider, ...pathParts] = key.split(':');
      const path = pathParts.join(':');
      const models = provider === 'ollama' 
        ? scanResults?.ollama.models 
        : scanResults?.lmstudio.models;
      const model = models?.find(m => m.path === path);
      if (model) size += model.size;
    });
    return size;
  };

  const renderProviderSection = (
    result: DetectionResult,
    provider: 'ollama' | 'lmstudio',
    icon: string,
    name: string
  ) => {
    const isExpanded = expandedSection === provider;
    const selectedCount = getSelectedCount(provider);
    
    return (
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpandedSection(isExpanded ? null : provider)}
          className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div className="text-left">
              <h4 className="font-medium text-zinc-200">{name}</h4>
              <p className="text-xs text-zinc-500">
                {result.exists ? (
                  <>
                    {result.models.length} model{result.models.length !== 1 ? 's' : ''} found
                    {result.notImported > 0 && (
                      <span className="text-amber-500 ml-2">
                        ({result.notImported} not in storage)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-600">Not installed</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result.models.length > 0 && (
              <span className="text-xs text-zinc-500">
                {formatBytes(result.totalSize)}
              </span>
            )}
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs rounded">
                {selectedCount} selected
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </button>
        
        {/* Content */}
        {isExpanded && (
          <div className="border-t border-zinc-700">
            {!result.exists ? (
              <div className="p-6 text-center text-zinc-500">
                <p>{name} models directory not found</p>
                <p className="text-xs mt-1">{result.path}</p>
              </div>
            ) : result.models.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">
                <p>No models found in {name}</p>
              </div>
            ) : (
              <>
                {/* Select all / Deselect all */}
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/30 border-b border-zinc-700">
                  <span className="text-xs text-zinc-500">
                    {result.models.length} model{result.models.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAll(provider)}
                      className="text-xs text-amber-500 hover:text-amber-400"
                    >
                      Select all
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      onClick={() => deselectAll(provider)}
                      className="text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                
                {/* Model list */}
                <div className="max-h-64 overflow-y-auto">
                  {result.models.map((model) => {
                    const modelKey = `${provider}:${model.path}`;
                    const isSelected = selectedModels.has(modelKey);
                    const isImporting = importing === modelKey;
                    
                    return (
                      <label
                        key={modelKey}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleModel(modelKey)}
                          disabled={isImporting}
                          className="w-4 h-4 rounded border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-zinc-200 truncate">
                              {model.displayName}
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
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {formatBytes(model.size)}
                          </p>
                        </div>
                        {isImporting && (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Import className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-200">Import Existing Models</h3>
            <p className="text-xs text-zinc-500">
              Import models from Ollama or LM Studio to central storage
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderSearch className="w-4 h-4" />
          )}
          {scanResults ? 'Rescan' : 'Scan for Models'}
        </button>
      </div>
      
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
      {/* Scan Results */}
      {scanResults && (
        <div className="space-y-3">
          {renderProviderSection(scanResults.ollama, 'ollama', '🦙', 'Ollama')}
          {renderProviderSection(scanResults.lmstudio, 'lmstudio', '🎛️', 'LM Studio')}
          
          {/* Import Controls */}
          {selectedModels.size > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-400">
                  {selectedModels.size} model{selectedModels.size !== 1 ? 's' : ''} selected
                  <span className="text-zinc-500 ml-2">({formatBytes(getSelectedSize())})</span>
                </span>
              </div>
              
              {/* Options */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deleteOriginals}
                  onChange={(e) => setDeleteOriginals(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                />
                <span className="text-zinc-300">Delete original files after import</span>
                <span className="text-xs text-zinc-500">
                  (saves {formatBytes(getSelectedSize())})
                </span>
              </label>
              
              {deleteOriginals && (
                <p className="text-xs text-amber-500/80 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Original files will be deleted only after successful copy verification
                </p>
              )}
              
              {/* Import Button */}
              <button
                onClick={handleImportSelected}
                disabled={importing !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Import className="w-4 h-4" />
                    Import Selected Models
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Import Progress */}
          {importProgress && importProgress.completed < importProgress.total && (
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  Importing {importProgress.current || '...'}
                </span>
                <span className="text-zinc-500">
                  {importProgress.completed} / {importProgress.total}
                </span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(importProgress.completed / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Import Complete */}
          {importProgress && importProgress.completed === importProgress.total && (
            <div className={`p-4 rounded-lg ${
              importProgress.errors.length > 0 
                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                : 'bg-green-500/10 border border-green-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <Check className={`w-4 h-4 ${
                  importProgress.errors.length > 0 ? 'text-yellow-500' : 'text-green-500'
                }`} />
                <span className={`text-sm ${
                  importProgress.errors.length > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  Import complete! {importProgress.total - importProgress.errors.length} succeeded
                  {importProgress.errors.length > 0 && `, ${importProgress.errors.length} failed`}
                </span>
              </div>
              {importProgress.errors.length > 0 && (
                <div className="mt-2 text-xs text-yellow-500/80 space-y-1">
                  {importProgress.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Summary Stats */}
          {scanResults.totalModels === 0 && (
            <div className="p-6 text-center text-zinc-500">
              <FolderSearch className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p>No existing models found in Ollama or LM Studio</p>
            </div>
          )}
          
          {scanResults.notImportedTotal === 0 && scanResults.totalModels > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-400">
                All detected models are already in central storage!
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Initial State */}
      {!scanResults && !isScanning && (
        <div className="p-8 text-center border border-dashed border-zinc-700 rounded-lg">
          <FolderSearch className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-400 mb-2">
            Scan your system for existing models
          </p>
          <p className="text-xs text-zinc-500">
            Models from Ollama and LM Studio can be imported to central storage
          </p>
        </div>
      )}
    </div>
  );
}
