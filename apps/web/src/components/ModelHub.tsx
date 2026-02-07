'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Check, 
  AlertCircle, 
  Loader2, 
  Server, 
  HardDrive,
  ExternalLink,
  Cpu,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { UnifiedModel, formatBytes, HuggingFaceModel } from '@/lib/models';
import { ProviderType } from '@/lib/providers';
import { RegistryState, ProviderState } from '@/lib/models/registry';
import { formatModelForDisplay, getRecommendedFile, GGUFFileInfo } from '@/lib/models/huggingface';

interface ModelHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  currentProvider: ProviderType;
  onSelectModel: (modelId: string, provider: ProviderType) => void;
}

type TabType = 'local' | 'huggingface';

export default function ModelHub({
  isOpen,
  onClose,
  currentModel,
  currentProvider,
  onSelectModel,
}: ModelHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [registry, setRegistry] = useState<RegistryState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Huggingface state
  const [hfQuery, setHfQuery] = useState('');
  const [hfModels, setHfModels] = useState<HuggingFaceModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHfModel, setSelectedHfModel] = useState<string | null>(null);
  const [hfModelDetails, setHfModelDetails] = useState<{ 
    id: string; 
    ggufFiles: GGUFFileInfo[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Fetch local models when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRegistry();
      if (hfModels.length === 0) {
        searchHuggingface('');
      }
    }
  }, [isOpen]);
  
  const fetchRegistry = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data: RegistryState = await response.json();
      setRegistry(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setIsLoading(false);
  };
  
  const searchHuggingface = async (query: string) => {
    setIsSearching(true);
    
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('limit', '20');
      
      const response = await fetch(`/api/models/huggingface?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setHfModels(data.models || []);
    } catch (err) {
      console.error('HF search error:', err);
    }
    
    setIsSearching(false);
  };
  
  const loadHfModelDetails = async (repoId: string) => {
    setSelectedHfModel(repoId);
    setIsLoadingDetails(true);
    
    try {
      const response = await fetch(`/api/models/huggingface/${repoId}`);
      if (!response.ok) throw new Error('Failed to load details');
      
      const data = await response.json();
      setHfModelDetails(data);
    } catch (err) {
      console.error('HF details error:', err);
    }
    
    setIsLoadingDetails(false);
  };
  
  const handleSelectLocalModel = (model: UnifiedModel) => {
    // Prefer the provider it's already loaded in
    const provider = model.provider || 
      (model.compatibility.ollama ? 'ollama' : 'lmstudio');
    onSelectModel(model.id, provider);
    onClose();
  };
  
  const getProviderBadge = (type: ProviderType, connected: boolean) => {
    const icon = type === 'ollama' ? '🦙' : '🎛️';
    const name = type === 'ollama' ? 'Ollama' : 'LM Studio';
    
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
          connected 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-zinc-700 text-zinc-500'
        }`}
      >
        {icon} {name}
        {connected ? <Check className="w-3 h-3" /> : null}
      </span>
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Model Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'local'
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4 inline mr-2" />
            Downloaded Models
          </button>
          <button
            onClick={() => setActiveTab('huggingface')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'huggingface'
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Browse Huggingface
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'local' ? (
            <LocalModelsTab
              registry={registry}
              isLoading={isLoading}
              error={error}
              currentModel={currentModel}
              onSelectModel={handleSelectLocalModel}
              onRefresh={fetchRegistry}
            />
          ) : (
            <HuggingfaceTab
              query={hfQuery}
              onQueryChange={setHfQuery}
              onSearch={() => searchHuggingface(hfQuery)}
              models={hfModels}
              isSearching={isSearching}
              selectedModel={selectedHfModel}
              modelDetails={hfModelDetails}
              isLoadingDetails={isLoadingDetails}
              onSelectModel={loadHfModelDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Local Models Tab Component
function LocalModelsTab({
  registry,
  isLoading,
  error,
  currentModel,
  onSelectModel,
  onRefresh,
}: {
  registry: RegistryState | null;
  isLoading: boolean;
  error: string | null;
  currentModel?: string;
  onSelectModel: (model: UnifiedModel) => void;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-zinc-400">{error}</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg font-medium hover:bg-amber-400"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!registry) return null;
  
  const { models, providers } = registry;
  
  return (
    <div className="p-4 space-y-4">
      {/* Provider Status */}
      <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
        <span className="text-sm text-zinc-400">Providers:</span>
        {providers.map((p) => (
          <span 
            key={p.type}
            className={`inline-flex items-center gap-1.5 text-sm ${
              p.connected ? 'text-green-400' : 'text-zinc-500'
            }`}
          >
            {p.type === 'ollama' ? '🦙' : '🎛️'}
            {p.type === 'ollama' ? 'Ollama' : 'LM Studio'}
            {p.connected ? (
              <Check className="w-4 h-4" />
            ) : (
              <span className="text-xs">(offline)</span>
            )}
          </span>
        ))}
        <button
          onClick={onRefresh}
          className="ml-auto p-1.5 hover:bg-zinc-700 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
      
      {/* Model List */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HardDrive className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">No models found</p>
          <p className="text-sm text-zinc-500">
            Start Ollama or LM Studio and download some models
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={model.id === currentModel}
              onSelect={() => onSelectModel(model)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Model Card Component
function ModelCard({
  model,
  isSelected,
  onSelect,
}: {
  model: UnifiedModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border text-left transition-all ${
        isSelected
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-zinc-100 truncate">
              {model.displayName}
            </span>
            {model.parameters && (
              <span className="px-1.5 py-0.5 text-xs bg-zinc-700 rounded text-zinc-400">
                {model.parameters}
              </span>
            )}
            {model.quantization && (
              <span className="px-1.5 py-0.5 text-xs bg-zinc-700 rounded text-zinc-400">
                {model.quantization}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">{model.id}</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {model.sizeBytes && (
            <span className="text-xs text-zinc-500">
              {formatBytes(model.sizeBytes)}
            </span>
          )}
          <div className="flex gap-1">
            {model.compatibility.ollama && (
              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                🦙
              </span>
            )}
            {model.compatibility.lmstudio && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                🎛️
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center gap-2 text-sm text-amber-500">
          <Check className="w-4 h-4" />
          Currently selected
        </div>
      )}
    </button>
  );
}

// Huggingface Tab Component
function HuggingfaceTab({
  query,
  onQueryChange,
  onSearch,
  models,
  isSearching,
  selectedModel,
  modelDetails,
  isLoadingDetails,
  onSelectModel,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  models: HuggingFaceModel[];
  isSearching: boolean;
  selectedModel: string | null;
  modelDetails: { id: string; ggufFiles: GGUFFileInfo[] } | null;
  isLoadingDetails: boolean;
  onSelectModel: (repoId: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search GGUF models on Huggingface..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          onClick={onSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg font-medium hover:bg-amber-400 disabled:opacity-50 flex items-center gap-2"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
      </div>
      
      <p className="text-xs text-zinc-500">
        💡 Browse GGUF models compatible with Ollama and LM Studio. 
        Copy the model ID and use <code className="bg-zinc-800 px-1 rounded">ollama pull</code> to download.
      </p>
      
      {/* Results */}
      {isSearching ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400">Search for models on Huggingface</p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => {
            const display = formatModelForDisplay(model);
            const isExpanded = selectedModel === model.id;
            
            return (
              <div
                key={model.id}
                className={`rounded-lg border transition-all ${
                  isExpanded
                    ? 'border-amber-500/50 bg-zinc-800/80'
                    : 'border-zinc-700 bg-zinc-800/50'
                }`}
              >
                <button
                  onClick={() => onSelectModel(model.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-zinc-100">
                          {display.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          by {display.author}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{display.stats}</p>
                    </div>
                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-zinc-700 rounded transition-colors"
                      title="View on Huggingface"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </a>
                  </div>
                </button>
                
                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-700 mt-2 pt-3">
                    {isLoadingDetails ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading files...
                      </div>
                    ) : modelDetails && modelDetails.id === model.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-400 mb-2">
                          Available GGUF files ({modelDetails.ggufFiles.length}):
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {modelDetails.ggufFiles.slice(0, 10).map((file) => (
                            <div
                              key={file.filename}
                              className="flex items-center justify-between p-2 bg-zinc-900 rounded text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-zinc-300 truncate">
                                  {file.filename}
                                </span>
                                {file.quantization && (
                                  <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded flex-shrink-0">
                                    {file.quantization}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                                {formatBytes(file.size)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {modelDetails.ggufFiles.length > 10 && (
                          <p className="text-xs text-zinc-500">
                            +{modelDetails.ggufFiles.length - 10} more files
                          </p>
                        )}
                        <div className="mt-3 p-2 bg-zinc-900 rounded text-xs">
                          <p className="text-zinc-400 mb-1">To download with Ollama:</p>
                          <code className="text-amber-400">
                            ollama pull hf.co/{model.id}
                          </code>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
