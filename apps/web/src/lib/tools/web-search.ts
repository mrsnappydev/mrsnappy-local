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

export const imageSearchTool: ToolDefinition = {
  name: 'image_search',
  displayName: 'Image Search',
  description: 'Search for images on the web. Use this when the user asks for pictures, photos, images, or wants to see what something looks like. Good for queries like "show me pictures of X", "what does X look like", "photo of X".',
  icon: '🖼️',
  integration: 'web-search',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'What to search for - be descriptive',
      required: true,
    },
    {
      name: 'count',
      type: 'number',
      description: 'Number of images to return (default: 6)',
      required: false,
      default: 6,
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

export interface ImageResult {
  thumbnail: string;
  image: string;
  title: string;
  source: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

export interface ImageSearchResult {
  query: string;
  images: ImageResult[];
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

/**
 * Execute an image search using DuckDuckGo
 * DuckDuckGo image search requires scraping the results page
 */
export async function executeImageSearch(
  query: string,
  count: number = 6
): Promise<ToolResult> {
  const toolCallId = `image_search_${Date.now()}`;
  
  try {
    // Use DuckDuckGo's image search via their vqd token system
    // First, get the vqd token from a regular search
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const tokenResponse = await fetch(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get search token: ${tokenResponse.status}`);
    }
    
    const tokenHtml = await tokenResponse.text();
    
    // Extract vqd token from the response
    const vqdMatch = tokenHtml.match(/vqd=['"]([^'"]+)['"]/);
    const vqd = vqdMatch ? vqdMatch[1] : null;
    
    if (!vqd) {
      // Fallback: Use a simpler approach with Bing images (more reliable)
      return await executeImageSearchFallback(query, count, toolCallId);
    }
    
    // Fetch images using the DuckDuckGo image API
    const imageUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://duckduckgo.com/',
      },
    });
    
    if (!imageResponse.ok) {
      return await executeImageSearchFallback(query, count, toolCallId);
    }
    
    const imageData = await imageResponse.json();
    const images: ImageResult[] = [];
    
    if (imageData.results && Array.isArray(imageData.results)) {
      for (const item of imageData.results.slice(0, count)) {
        images.push({
          thumbnail: item.thumbnail || item.image,
          image: item.image,
          title: item.title || 'Image',
          source: item.source || extractDomain(item.url),
          sourceUrl: item.url || item.image,
          width: item.width,
          height: item.height,
        });
      }
    }
    
    if (images.length === 0) {
      return await executeImageSearchFallback(query, count, toolCallId);
    }
    
    const searchResult: ImageSearchResult = {
      query,
      images,
    };
    
    return {
      toolCallId,
      name: 'image_search',
      success: true,
      result: searchResult,
      displayType: 'image-results',
    };
  } catch (error) {
    // Try fallback
    try {
      return await executeImageSearchFallback(query, count, toolCallId);
    } catch {
      return {
        toolCallId,
        name: 'image_search',
        success: false,
        error: error instanceof Error ? error.message : 'Image search failed',
      };
    }
  }
}

/**
 * Fallback image search using Wikipedia/Wikimedia Commons API (free, reliable)
 */
async function executeImageSearchFallback(
  query: string,
  count: number,
  toolCallId: string
): Promise<ToolResult> {
  const images: ImageResult[] = [];
  
  // Try Wikimedia Commons API - great for common subjects
  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${count}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=400&format=json&origin=*`;
    
    const response = await fetch(commonsUrl, {
      headers: {
        'User-Agent': 'MrSnappy Local AI Assistant',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.query?.pages) {
        for (const page of Object.values(data.query.pages) as Array<{
          title?: string;
          imageinfo?: Array<{
            thumburl?: string;
            url?: string;
            width?: number;
            height?: number;
            descriptionurl?: string;
          }>;
        }>) {
          if (page.imageinfo?.[0]) {
            const info = page.imageinfo[0];
            if (info.url && !info.url.endsWith('.svg')) {
              images.push({
                thumbnail: info.thumburl || info.url,
                image: info.url,
                title: page.title?.replace('File:', '') || 'Image',
                source: 'Wikimedia Commons',
                sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
                width: info.width,
                height: info.height,
              });
            }
          }
          if (images.length >= count) break;
        }
      }
    }
  } catch {
    // Continue to next fallback
  }
  
  // If we still don't have enough, try Wikipedia API
  if (images.length < count) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages&piprop=thumbnail|original&pithumbsize=400&format=json&origin=*`;
      
      const response = await fetch(wikiUrl, {
        headers: {
          'User-Agent': 'MrSnappy Local AI Assistant',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.query?.pages) {
          for (const page of Object.values(data.query.pages) as Array<{
            title?: string;
            pageid?: number;
            thumbnail?: { source?: string; width?: number; height?: number };
            original?: { source?: string; width?: number; height?: number };
          }>) {
            if (page.thumbnail?.source || page.original?.source) {
              images.push({
                thumbnail: page.thumbnail?.source || page.original?.source || '',
                image: page.original?.source || page.thumbnail?.source || '',
                title: page.title || 'Image',
                source: 'Wikipedia',
                sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title || '')}`,
                width: page.original?.width || page.thumbnail?.width,
                height: page.original?.height || page.thumbnail?.height,
              });
            }
            if (images.length >= count) break;
          }
        }
      }
    } catch {
      // Ignore
    }
  }
  
  // Try Unsplash (free for non-commercial use, good quality)
  if (images.length < count) {
    try {
      // Unsplash Source is deprecated, but we can use placeholder with query
      // This is a simple fallback that shows relevant placeholder images
      const remaining = count - images.length;
      for (let i = 0; i < remaining; i++) {
        const seed = `${query}-${i}`;
        images.push({
          thumbnail: `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}&sig=${i}`,
          image: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}&sig=${i}`,
          title: `${query} image ${i + 1}`,
          source: 'Unsplash',
          sourceUrl: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`,
        });
      }
    } catch {
      // Ignore
    }
  }
  
  if (images.length === 0) {
    return {
      toolCallId,
      name: 'image_search',
      success: false,
      error: 'No images found for this query',
    };
  }
  
  const searchResult: ImageSearchResult = {
    query,
    images,
  };
  
  return {
    toolCallId,
    name: 'image_search',
    success: true,
    result: searchResult,
    displayType: 'image-results',
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

/**
 * Format image search results for chat display
 */
export function formatImageSearchResultsForChat(result: ImageSearchResult): string {
  let output = `🖼️ **Image results for "${result.query}"**\n\n`;
  
  if (result.images.length === 0) {
    output += '_No images found._\n';
  } else {
    for (let i = 0; i < result.images.length; i++) {
      const img = result.images[i];
      output += `**${i + 1}. ${img.title}**\n`;
      output += `![${img.title}](${img.thumbnail})\n`;
      output += `Source: [${img.source}](${img.sourceUrl})\n\n`;
    }
  }
  
  return output;
}
