'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Play,
  Square,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { UnifiedModel, formatBytes, HuggingFaceModel, ModelCapability, CAPABILITY_FILTERS, getModelCapabilities, getModelMetadata } from '@/lib/models';
import { ProviderType } from '@/lib/providers';
import { RegistryState, ProviderState } from '@/lib/models/registry';
import { formatModelForDisplay, getRecommendedFile, GGUFFileInfo } from '@/lib/models/huggingface';
import CapabilityBadge, { CapabilityBadges } from './CapabilityBadge';
import ModelRecommendations from './ModelRecommendations';
import { BestForText } from './ModelCapabilities';
import ModelStorage from './ModelStorage';

interface ModelHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  currentProvider: ProviderType;
  onSelectModel: (modelId: string, provider: ProviderType) => void;
}

type TabType = 'local' | 'storage' | 'huggingface';
type FilterType = 'all' | 'ollama' | 'lmstudio';
type CapabilityFilterType = ModelCapability | 'all';

interface DownloadState {
  modelId: string;
  status: string;
  percentage: number;
  isDownloading: boolean;
  error?: string;
}

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
  const [filterProvider, setFilterProvider] = useState<FilterType>('all');
  const [filterCapability, setFilterCapability] = useState<CapabilityFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  // Download state
  const [downloads, setDownloads] = useState<Map<string, DownloadState>>(new Map());
  const downloadAbortRef = useRef<Map<string, AbortController>>(new Map());
  
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
    if (selectedHfModel === repoId) {
      setSelectedHfModel(null);
      return;
    }
    
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
  
  const startDownload = async (modelId: string, source: 'huggingface' | 'ollama-library' = 'huggingface') => {
    // Initialize download state
    setDownloads(prev => new Map(prev).set(modelId, {
      modelId,
      status: 'Starting download...',
      percentage: 0,
      isDownloading: true,
    }));
    
    const abortController = new AbortController();
    downloadAbortRef.current.set(modelId, abortController);
    
    try {
      const response = await fetch(
        `/api/models/download?model=${encodeURIComponent(modelId)}&source=${source}`,
        { signal: abortController.signal }
      );
      
      if (!response.ok || !response.body) {
        throw new Error('Failed to start download');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setDownloads(prev => {
                const next = new Map(prev);
                next.set(modelId, {
                  modelId,
                  status: 'Download complete!',
                  percentage: 100,
                  isDownloading: false,
                });
                return next;
              });
              // Refresh model list
              setTimeout(fetchRegistry, 1000);
              continue;
            }
            
            try {
              const progress = JSON.parse(data);
              setDownloads(prev => {
                const next = new Map(prev);
                next.set(modelId, {
                  modelId,
                  status: progress.status || 'Downloading...',
                  percentage: progress.percentage || 0,
                  isDownloading: true,
                });
                return next;
              });
            } catch {}
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setDownloads(prev => {
          const next = new Map(prev);
          next.set(modelId, {
            modelId,
            status: 'Download failed',
            percentage: 0,
            isDownloading: false,
            error: (err as Error).message,
          });
          return next;
        });
      }
    }
    
    downloadAbortRef.current.delete(modelId);
  };
  
  const cancelDownload = (modelId: string) => {
    const controller = downloadAbortRef.current.get(modelId);
    if (controller) {
      controller.abort();
      downloadAbortRef.current.delete(modelId);
    }
    
    setDownloads(prev => {
      const next = new Map(prev);
      next.set(modelId, {
        modelId,
        status: 'Cancelled',
        percentage: 0,
        isDownloading: false,
      });
      return next;
    });
  };
  
  const handleSelectLocalModel = (model: UnifiedModel) => {
    // Prefer the provider it's already loaded in
    const provider = model.provider || 
      (model.compatibility.ollama ? 'ollama' : 'lmstudio');
    onSelectModel(model.id, provider);
    onClose();
  };
  
  // Filter models
  const filteredModels = registry?.models.filter(model => {
    // Provider filter
    if (filterProvider === 'ollama' && !model.compatibility.ollama) return false;
    if (filterProvider === 'lmstudio' && !model.compatibility.lmstudio) return false;
    
    // Capability filter
    if (filterCapability !== 'all') {
      const modelCapabilities = getModelCapabilities(model.id);
      if (!modelCapabilities.includes(filterCapability)) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        model.id.toLowerCase().includes(query) ||
        model.displayName.toLowerCase().includes(query) ||
        (model.parameters?.toLowerCase().includes(query))
      );
    }
    
    return true;
  }) || [];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
            {registry && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-800 rounded">
                {registry.models.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'storage'
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-4 h-4 inline mr-2" />
            Central Storage
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
          {activeTab === 'local' && (
            <LocalModelsTab
              registry={registry}
              filteredModels={filteredModels}
              isLoading={isLoading}
              error={error}
              currentModel={currentModel}
              currentProvider={currentProvider}
              filterProvider={filterProvider}
              filterCapability={filterCapability}
              searchQuery={searchQuery}
              onFilterChange={setFilterProvider}
              onCapabilityFilterChange={setFilterCapability}
              onSearchChange={setSearchQuery}
              onSelectModel={handleSelectLocalModel}
              onRefresh={fetchRegistry}
            />
          )}
          {activeTab === 'storage' && (
            <ModelStorage onRefreshNeeded={fetchRegistry} />
          )}
          {activeTab === 'huggingface' && (
            <HuggingfaceTab
              query={hfQuery}
              onQueryChange={setHfQuery}
              onSearch={() => searchHuggingface(hfQuery)}
              models={hfModels}
              isSearching={isSearching}
              selectedModel={selectedHfModel}
              modelDetails={hfModelDetails}
              isLoadingDetails={isLoadingDetails}
              downloads={downloads}
              onSelectModel={loadHfModelDetails}
              onDownload={startDownload}
              onCancelDownload={cancelDownload}
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
  filteredModels,
  isLoading,
  error,
  currentModel,
  currentProvider,
  filterProvider,
  filterCapability,
  searchQuery,
  onFilterChange,
  onCapabilityFilterChange,
  onSearchChange,
  onSelectModel,
  onRefresh,
}: {
  registry: RegistryState | null;
  filteredModels: UnifiedModel[];
  isLoading: boolean;
  error: string | null;
  currentModel?: string;
  currentProvider: ProviderType;
  filterProvider: FilterType;
  filterCapability: CapabilityFilterType;
  searchQuery: string;
  onFilterChange: (filter: FilterType) => void;
  onCapabilityFilterChange: (filter: CapabilityFilterType) => void;
  onSearchChange: (query: string) => void;
  onSelectModel: (model: UnifiedModel) => void;
  onRefresh: () => void;
}) {
  if (isLoading && !registry) {
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
  
  const { providers } = registry;
  
  return (
    <div className="p-4 space-y-4">
      {/* Provider Status Bar */}
      <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
        <span className="text-sm text-zinc-400">Providers:</span>
        <div className="flex items-center gap-3 flex-1">
          {providers.map((p) => (
            <div 
              key={p.type}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm ${
                p.connected 
                  ? 'bg-green-500/10 text-green-400' 
                  : 'bg-zinc-700/50 text-zinc-500'
              }`}
            >
              {p.type === 'ollama' ? '🦙' : '🎛️'}
              {p.type === 'ollama' ? 'Ollama' : 'LM Studio'}
              {p.connected ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-xs opacity-70">({p.models.length})</span>
                </>
              ) : (
                <span className="text-xs">(offline)</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search local models..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="relative">
          <select
            value={filterProvider}
            onChange={(e) => onFilterChange(e.target.value as FilterType)}
            className="appearance-none px-4 py-2 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Providers</option>
            <option value="ollama">🦙 Ollama only</option>
            <option value="lmstudio">🎛️ LM Studio only</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>
      
      {/* Capability Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {CAPABILITY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onCapabilityFilterChange(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCapability === filter.id
                ? 'bg-amber-500 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {filter.icon} {filter.label}
          </button>
        ))}
      </div>
      
      {/* Model Recommendations - show when browsing all or filtering by capability */}
      {!searchQuery && filteredModels.length > 0 && (
        <ModelRecommendations 
          currentCapabilityFilter={filterCapability}
          onSelectModel={(modelKey) => {
            // Search for this model
            onSearchChange(modelKey);
          }}
        />
      )}
      
      {/* Model List */}
      {filteredModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HardDrive className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">
            {searchQuery || filterProvider !== 'all' || filterCapability !== 'all'
              ? 'No models match your filters' 
              : 'No models found'}
          </p>
          <p className="text-sm text-zinc-500">
            {searchQuery || filterProvider !== 'all' || filterCapability !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start a provider and download some models'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={model.id === currentModel}
              currentProvider={currentProvider}
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
  currentProvider,
  onSelect,
}: {
  model: UnifiedModel;
  isSelected: boolean;
  currentProvider: ProviderType;
  onSelect: () => void;
}) {
  const isOnCurrentProvider = 
    (currentProvider === 'ollama' && model.compatibility.ollama) ||
    (currentProvider === 'lmstudio' && model.compatibility.lmstudio);
  
  // Get capabilities for this model
  const capabilities = getModelCapabilities(model.id);
  const metadata = getModelMetadata(model.id);
  
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
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
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-zinc-500 truncate">{model.id}</p>
          </div>
          {/* Capability badges */}
          <div className="flex items-center gap-1 mt-2">
            <CapabilityBadges capabilities={capabilities} compact maxVisible={4} />
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          {model.sizeBytes && (
            <span className="text-xs text-zinc-500">
              {formatBytes(model.sizeBytes)}
            </span>
          )}
          <div className="flex gap-1">
            {model.compatibility.ollama && (
              <span 
                className={`px-1.5 py-0.5 text-xs rounded ${
                  currentProvider === 'ollama' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}
                title="Compatible with Ollama"
              >
                🦙
              </span>
            )}
            {model.compatibility.lmstudio && (
              <span 
                className={`px-1.5 py-0.5 text-xs rounded ${
                  currentProvider === 'lmstudio' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}
                title="Compatible with LM Studio"
              >
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
      
      {!isSelected && !isOnCurrentProvider && (
        <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center gap-2 text-xs text-zinc-500">
          <AlertCircle className="w-3 h-3" />
          Will switch provider when selected
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
  downloads,
  onSelectModel,
  onDownload,
  onCancelDownload,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  models: HuggingFaceModel[];
  isSearching: boolean;
  selectedModel: string | null;
  modelDetails: { id: string; ggufFiles: GGUFFileInfo[] } | null;
  isLoadingDetails: boolean;
  downloads: Map<string, DownloadState>;
  onSelectModel: (repoId: string) => void;
  onDownload: (modelId: string, source: 'huggingface' | 'ollama-library') => void;
  onCancelDownload: (modelId: string) => void;
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
      
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">
          Browse GGUF models compatible with Ollama. Click "Download" to pull directly into Ollama.
          Make sure Ollama is running before downloading.
        </p>
      </div>
      
      {/* Results */}
      {isSearching ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400">Search for models on Huggingface</p>
          <p className="text-sm text-zinc-500 mt-1">Try "llama", "mistral", "phi", or "qwen"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => {
            const display = formatModelForDisplay(model);
            const isExpanded = selectedModel === model.id;
            const downloadState = downloads.get(model.id);
            
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-zinc-100">
                          {display.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          by {display.author}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{display.stats}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {downloadState?.isDownloading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${downloadState.percentage}%` }}
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelDownload(model.id);
                            }}
                            className="p-1.5 hover:bg-zinc-700 rounded"
                            title="Cancel download"
                          >
                            <Square className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(model.id, 'huggingface');
                          }}
                          className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-lg flex items-center gap-1.5"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
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
                  </div>
                  
                  {/* Download status */}
                  {downloadState && (
                    <div className={`mt-2 text-xs ${
                      downloadState.error ? 'text-red-400' : 'text-zinc-400'
                    }`}>
                      {downloadState.status}
                    </div>
                  )}
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
                        <div className="mt-3 p-3 bg-zinc-900 rounded text-xs border border-zinc-800">
                          <p className="text-zinc-400 mb-2">Manual download command:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-amber-400 flex-1 break-all">
                              ollama pull hf.co/{model.id}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(`ollama pull hf.co/${model.id}`)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded flex-shrink-0"
                            >
                              Copy
                            </button>
                          </div>
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
