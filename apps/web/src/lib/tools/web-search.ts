// Web Search Tool for MrSnappy Local
// Uses DuckDuckGo Instant Answer API (free, no key needed)

import { ToolDefinition, ToolResult } from './types';

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  displayName: 'Web Search',
  description: 'Search the web for current information, news, facts, or any topic. Use this when you need up-to-date information or to find specific websites/resources.',
  icon: '🔍',
  integration: 'web-search',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'The search query - be specific for better results',
      required: true,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of results to return (default: 5)',
      required: false,
      default: 5,
    },
  ],
};

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface WebSearchResult {
  query: string;
  results: SearchResult[];
  instant_answer?: string;
}

/**
 * Execute a web search using DuckDuckGo
 * DuckDuckGo's Instant Answer API is free and doesn't require an API key
 */
export async function executeWebSearch(
  query: string,
  limit: number = 5
): Promise<ToolResult> {
  const toolCallId = `search_${Date.now()}`;
  
  try {
    // Use DuckDuckGo's HTML search (more reliable than their API for actual results)
    // We'll scrape the lite version which is simpler
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MrSnappy Local AI Assistant',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const html = await response.text();
    const results = parseDuckDuckGoResults(html, limit);
    
    // Also try to get an instant answer from DuckDuckGo's API
    let instantAnswer: string | undefined;
    try {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const apiResponse = await fetch(apiUrl);
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.AbstractText) {
          instantAnswer = apiData.AbstractText;
        } else if (apiData.Answer) {
          instantAnswer = apiData.Answer;
        }
      }
    } catch {
      // Instant answer failed, that's okay
    }
    
    const searchResult: WebSearchResult = {
      query,
      results,
      instant_answer: instantAnswer,
    };
    
    return {
      toolCallId,
      name: 'web_search',
      success: true,
      result: searchResult,
      displayType: 'search-results',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'web_search',
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Parse DuckDuckGo HTML search results
 */
function parseDuckDuckGoResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  // Simple regex-based parsing for DuckDuckGo lite HTML
  // Match result blocks: <a rel="nofollow" class="result__a" href="...">Title</a>
  // and snippets: <a class="result__snippet" href="...">Snippet text</a>
  
  // Pattern for result links
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g;
  
  const links: { url: string; title: string }[] = [];
  let match;
  
  while ((match = linkRegex.exec(html)) !== null && links.length < limit * 2) {
    // DuckDuckGo wraps URLs, need to extract actual URL
    const wrappedUrl = match[1];
    const title = decodeHTMLEntities(match[2].trim());
    
    // Extract actual URL from DuckDuckGo redirect
    let url = wrappedUrl;
    const uddgMatch = wrappedUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      url = decodeURIComponent(uddgMatch[1]);
    }
    
    if (title && url && !url.includes('duckduckgo.com')) {
      links.push({ url, title });
    }
  }
  
  // Get snippets
  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null && snippets.length < limit * 2) {
    const snippet = decodeHTMLEntities(
      match[1].replace(/<[^>]*>/g, '').trim()
    );
    if (snippet) {
      snippets.push(snippet);
    }
  }
  
  // Combine links and snippets
  for (let i = 0; i < Math.min(links.length, limit); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] || '',
      source: new URL(links[i].url).hostname.replace('www.', ''),
    });
  }
  
  return results;
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => 
    String.fromCharCode(parseInt(num, 10))
  );
  
  return result;
}

/**
 * Format search results for chat display
 */
export function formatSearchResultsForChat(result: WebSearchResult): string {
  let output = `🔍 **Search results for "${result.query}"**\n\n`;
  
  if (result.instant_answer) {
    output += `> 💡 ${result.instant_answer}\n\n`;
  }
  
  if (result.results.length === 0) {
    output += '_No results found._\n';
  } else {
    for (let i = 0; i < result.results.length; i++) {
      const r = result.results[i];
      output += `**${i + 1}. ${r.title}**\n`;
      if (r.snippet) {
        output += `${r.snippet}\n`;
      }
      output += `🔗 [${r.source || r.url}](${r.url})\n\n`;
    }
  }
  
  return output;
}
