'use client';

import { ExternalLink, Search, CheckCircle, XCircle } from 'lucide-react';
import { ToolResult, WebSearchResult, ImageSearchResult } from '@/lib/tools';
import ImageResultCard from './ImageResultCard';

interface ToolResultCardProps {
  result: ToolResult;
}

export default function ToolResultCard({ result }: ToolResultCardProps) {
  if (!result.success) {
    return (
      <div className="my-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <XCircle className="w-4 h-4" />
          <span className="font-medium">{result.name} failed</span>
        </div>
        <p className="text-sm text-red-300">{result.error}</p>
      </div>
    );
  }

  // Image search results - show image grid
  if (result.displayType === 'image-results' && result.result) {
    const imageResult = result.result as ImageSearchResult;
    return <ImageResultCard result={imageResult} />;
  }

  // Web search results - show clickable links
  if (result.displayType === 'search-results' && result.result) {
    const searchResult = result.result as WebSearchResult;
    return <SearchResultsCard result={searchResult} />;
  }

  // Default: JSON display
  return (
    <div className="my-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
      <div className="flex items-center gap-2 text-green-400 mb-2">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium">{result.name}</span>
      </div>
      <pre className="text-sm text-zinc-300 overflow-x-auto">
        {JSON.stringify(result.result, null, 2)}
      </pre>
    </div>
  );
}

interface SearchResultsCardProps {
  result: WebSearchResult;
}

function SearchResultsCard({ result }: SearchResultsCardProps) {
  return (
    <div className="my-4 rounded-xl bg-purple-500/5 border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2 text-purple-400">
          <Search className="w-4 h-4" />
          <span className="font-medium">Search: "{result.query}"</span>
        </div>
      </div>

      {/* Instant Answer */}
      {result.instant_answer && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <p className="text-sm text-amber-200">
            💡 {result.instant_answer}
          </p>
        </div>
      )}

      {/* Results */}
      <div className="divide-y divide-zinc-800">
        {result.results.length === 0 ? (
          <div className="px-4 py-6 text-center text-zinc-500">
            No results found
          </div>
        ) : (
          result.results.map((item, index) => (
            <div key={index} className="px-4 py-3 hover:bg-zinc-800/30 transition-colors">
              <a 
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-zinc-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-purple-400/70 mt-0.5">{item.source || new URL(item.url).hostname}</p>
                    {item.snippet && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{item.snippet}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
                </div>
              </a>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">
          {result.results.length} result{result.results.length !== 1 ? 's' : ''} via DuckDuckGo
        </p>
      </div>
    </div>
  );
}

export { SearchResultsCard };
