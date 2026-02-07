'use client';

import { Sparkles, ChevronRight } from 'lucide-react';
import { ModelCapability, CAPABILITIES } from '@/lib/models/capabilities';
import { MODEL_DATABASE, getRecommendedModels } from '@/lib/models/database';

interface ModelRecommendationsProps {
  onSelectModel?: (modelKey: string) => void;
  currentCapabilityFilter?: ModelCapability | 'all';
  className?: string;
}

// Recommendation categories
const RECOMMENDATION_CATEGORIES: Array<{
  id: 'coding' | 'vision' | 'small' | 'creative' | 'reasoning';
  title: string;
  description: string;
}> = [
  {
    id: 'coding',
    title: '💻 Best for Coding',
    description: 'Code generation, debugging, explanations',
  },
  {
    id: 'vision',
    title: '👁️ Best for Images',
    description: 'Image understanding and visual Q&A',
  },
  {
    id: 'small',
    title: '📱 Best for Limited RAM',
    description: 'Runs well on constrained hardware',
  },
  {
    id: 'reasoning',
    title: '🧮 Best for Reasoning',
    description: 'Math, logic, and analytical tasks',
  },
  {
    id: 'creative',
    title: '✍️ Best for Creative Writing',
    description: 'Stories, roleplay, brainstorming',
  },
];

export default function ModelRecommendations({ 
  onSelectModel, 
  currentCapabilityFilter = 'all',
  className = '' 
}: ModelRecommendationsProps) {
  // If filtering by capability, show only that category
  const categoriesToShow = currentCapabilityFilter !== 'all'
    ? RECOMMENDATION_CATEGORIES.filter(c => c.id === currentCapabilityFilter)
    : RECOMMENDATION_CATEGORIES;
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span>Recommended Models</span>
      </div>
      
      {categoriesToShow.map(category => (
        <RecommendationCategory
          key={category.id}
          category={category}
          onSelectModel={onSelectModel}
        />
      ))}
    </div>
  );
}

interface RecommendationCategoryProps {
  category: typeof RECOMMENDATION_CATEGORIES[0];
  onSelectModel?: (modelKey: string) => void;
}

function RecommendationCategory({ category, onSelectModel }: RecommendationCategoryProps) {
  const models = getRecommendedModels(category.id).slice(0, 4);
  
  if (models.length === 0) return null;
  
  return (
    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-zinc-200">{category.title}</h3>
          <p className="text-xs text-zinc-500">{category.description}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {models.map(({ key, metadata }) => (
          <button
            key={key}
            onClick={() => onSelectModel?.(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors group"
          >
            <span className="text-zinc-200">{metadata.name}</span>
            {metadata.parameterSizes?.[0] && (
              <span className="text-xs text-zinc-500">
                {metadata.parameterSizes[0]}
              </span>
            )}
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-amber-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Inline suggestion component for chat context
interface InlineSuggestionProps {
  suggestedCapability: ModelCapability;
  suggestedModels: string[];
  onSelectModel?: (modelKey: string) => void;
  onDismiss?: () => void;
}

export function InlineSuggestion({ 
  suggestedCapability, 
  suggestedModels,
  onSelectModel,
  onDismiss 
}: InlineSuggestionProps) {
  const capInfo = CAPABILITIES[suggestedCapability];
  const modelsToShow = suggestedModels.slice(0, 2);
  
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <span className="text-amber-500">💡</span>
      <span className="text-sm text-amber-400">
        Try{' '}
        {modelsToShow.map((model, i) => (
          <span key={model}>
            <button
              onClick={() => onSelectModel?.(model)}
              className="underline hover:text-amber-300"
            >
              {MODEL_DATABASE[model]?.name || model}
            </button>
            {i < modelsToShow.length - 1 && ' or '}
          </span>
        ))}
        {' '}for {capInfo?.label.toLowerCase()} tasks
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto text-amber-500/50 hover:text-amber-500 text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Detect task type from message content
export function detectTaskCapability(message: string): ModelCapability | null {
  const lowerMessage = message.toLowerCase();
  
  // Coding indicators
  if (
    /write|create|fix|debug|code|function|class|implement|refactor|python|javascript|typescript|rust|java|cpp|sql|html|css/i.test(lowerMessage) &&
    /code|program|script|function|api|bug|error/i.test(lowerMessage)
  ) {
    return 'coding';
  }
  
  // Vision indicators (for future when images can be uploaded)
  if (/image|picture|photo|screenshot|diagram|what.*see|describe.*this/i.test(lowerMessage)) {
    return 'vision';
  }
  
  // Math/reasoning indicators
  if (/calculate|solve|equation|math|proof|logic|analyze.*data/i.test(lowerMessage)) {
    return 'reasoning';
  }
  
  // Creative indicators
  if (/write.*story|creative|poem|fiction|roleplay|imagine|character/i.test(lowerMessage)) {
    return 'creative';
  }
  
  return null;
}
