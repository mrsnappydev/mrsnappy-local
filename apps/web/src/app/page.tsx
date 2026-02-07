'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Zap, Loader2, RefreshCw, Cpu, Puzzle } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useSettings } from '@/hooks/useSettings';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Message } from '@/types/chat';
import { ProviderType } from '@/lib/providers';
import { parseToolCalls, ToolCall, ToolResult } from '@/lib/tools';
import { buildToolsSystemPrompt } from '@/lib/tools/registry';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MessageActions from '@/components/MessageActions';
import ModelHub from '@/components/ModelHub';
import IntegrationsSettings from '@/components/IntegrationsSettings';
import ProviderStatusBar from '@/components/ProviderStatusBar';
import NoProviderPrompt from '@/components/NoProviderPrompt';

export default function Home() {
  const {
    currentConversation,
    isLoaded: conversationsLoaded,
    getConversationPreviews,
    newConversation,
    selectConversation,
    addMessage,
    updateMessage,
    editMessage,
    deleteMessagesFrom,
    deleteConversation,
    searchConversations,
    exportConversations,
    importConversations,
  } = useConversations();

  const {
    settings,
    isLoaded: settingsLoaded,
    updateSettings,
    switchProvider,
    resetSettings,
  } = useSettings();

  const {
    integrations,
    isLoaded: integrationsLoaded,
    updateIntegrations,
    getEnabledIntegrations,
  } = useIntegrations();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [hasCheckedInitialConnection, setHasCheckedInitialConnection] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelHubOpen, setIsModelHubOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = currentConversation?.messages || [];
  const isLoaded = conversationsLoaded && settingsLoaded && integrationsLoaded;
  
  // Get enabled integrations for tool support
  const enabledIntegrations = getEnabledIntegrations();

  // Check provider connection on mount and when settings change
  useEffect(() => {
    if (settingsLoaded) {
      checkProviderConnection();
    }
  }, [settingsLoaded, settings.provider, settings.providerUrl]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const checkProviderConnection = async () => {
    try {
      const endpoint = settings.provider === 'lmstudio' 
        ? `${settings.providerUrl}/v1/models`
        : `${settings.providerUrl}/api/tags`;
      
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(5000),
      });
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    }
    setHasCheckedInitialConnection(true);
  };

  // Handle provider ready from NoProviderPrompt
  const handleProviderReady = useCallback((provider: ProviderType) => {
    switchProvider(provider);
    setIsConnected(true);
  }, [switchProvider]);

  // Handle provider status change from ProviderStatusBar
  const handleProviderStatusChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Build request body with provider settings and tool support
  const buildRequestBody = (messagesForApi: { role: string; content: string }[]) => {
    // Add tools to system prompt if any integrations are enabled
    const toolsPromptAddition = buildToolsSystemPrompt(enabledIntegrations);
    const fullSystemPrompt = settings.systemPrompt + toolsPromptAddition;
    
    return {
      messages: messagesForApi,
      provider: settings.provider,
      providerUrl: settings.providerUrl,
      model: settings.model,
      systemPrompt: fullSystemPrompt,
    };
  };

  // Execute tool calls found in assistant response
  const executeToolCalls = async (content: string): Promise<{ results: ToolResult[], cleanContent: string }> => {
    const toolCalls = parseToolCalls(content);
    if (toolCalls.length === 0) {
      return { results: [], cleanContent: content };
    }
    
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolCalls }),
      });
      
      if (!response.ok) {
        throw new Error('Tool execution failed');
      }
      
      const { results } = await response.json();
      
      // Remove tool call tags from content for cleaner display
      let cleanContent = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
      
      return { results, cleanContent };
    } catch (error) {
      console.error('Tool execution error:', error);
      return { results: [], cleanContent: content };
    }
  };

  const sendStreamingMessage = useCallback(async (userMessageContent: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: userMessageContent,
    });

    // Add placeholder assistant message
    const assistantMsg = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    setStreamingMessageId(assistantMsg.id);

    try {
      abortControllerRef.current = new AbortController();
      
      // Build messages array from current conversation + new user message
      const messagesForApi = [...messages, { role: 'user' as const, content: userMessageContent }]
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(messagesForApi)),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to get response');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const json = JSON.parse(data);
              if (json.content) {
                fullContent += json.content;
                updateMessage(assistantMsg.id, { content: fullContent });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Check for tool calls and execute them
      if (enabledIntegrations.length > 0 && fullContent.includes('<tool_call>')) {
        const { results, cleanContent } = await executeToolCalls(fullContent);
        
        if (results.length > 0) {
          // Format tool results
          let toolResultsContent = cleanContent ? cleanContent + '\n\n' : '';
          for (const result of results) {
            if (result.success) {
              // Format the result based on type
              if (result.displayType === 'search-results' && result.result) {
                const searchResult = result.result as { query: string; results: Array<{ title: string; url: string; snippet: string; source?: string }>; instant_answer?: string };
                toolResultsContent += `🔍 **Search results for "${searchResult.query}"**\n\n`;
                if (searchResult.instant_answer) {
                  toolResultsContent += `> 💡 ${searchResult.instant_answer}\n\n`;
                }
                for (let i = 0; i < searchResult.results.length; i++) {
                  const r = searchResult.results[i];
                  toolResultsContent += `**${i + 1}. ${r.title}**\n`;
                  if (r.snippet) toolResultsContent += `${r.snippet}\n`;
                  toolResultsContent += `🔗 [${r.source || r.url}](${r.url})\n\n`;
                }
              } else {
                toolResultsContent += `✅ ${result.name}: ${JSON.stringify(result.result)}\n\n`;
              }
            } else {
              toolResultsContent += `❌ ${result.name} failed: ${result.error}\n\n`;
            }
          }
          updateMessage(assistantMsg.id, { content: toolResultsContent, isStreaming: false });
        } else {
          updateMessage(assistantMsg.id, { isStreaming: false });
        }
      } else {
        // Mark streaming as complete
        updateMessage(assistantMsg.id, { isStreaming: false });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - content already has whatever was streamed
        updateMessage(assistantMsg.id, { isStreaming: false });
      } else {
        console.error('Streaming error:', error);
        const providerName = settings.provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
        updateMessage(assistantMsg.id, { 
          content: `Sorry, I had trouble responding. Make sure ${providerName} is running!`, 
          isStreaming: false 
        });
      }
    }

    setStreamingMessageId(null);
  }, [messages, addMessage, updateMessage, settings]);

  const sendNonStreamingMessage = useCallback(async (userMessageContent: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: userMessageContent,
    });

    try {
      const messagesForApi = [...messages, { role: 'user' as const, content: userMessageContent }]
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(messagesForApi)),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      
      addMessage({
        role: 'assistant',
        content: data.content,
      });
    } catch (error) {
      console.error('Error:', error);
      const providerName = settings.provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
      addMessage({
        role: 'assistant',
        content: `Sorry, I had trouble responding. Make sure ${providerName} is running!`,
      });
    }
  }, [messages, addMessage, settings]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    if (settings.streamingEnabled) {
      await sendStreamingMessage(userInput);
    } else {
      await sendNonStreamingMessage(userInput);
    }

    setIsLoading(false);
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewConversation = () => {
    newConversation();
    setInput('');
  };

  // Handle regenerating an assistant response
  const handleRegenerate = useCallback(async (messageId: string) => {
    // Find the assistant message and the user message before it
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;
    
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;
    
    // Delete from the user message onwards
    deleteMessagesFrom(userMessage.id);
    
    // Wait a tick for state to update, then resend
    setIsLoading(true);
    
    // Need to use the messages up to (but not including) the user message
    const messagesBeforeUser = messages.slice(0, messageIndex - 1);
    const userContent = userMessage.content;
    
    // Build API messages
    const messagesForApi = [...messagesBeforeUser, { role: 'user' as const, content: userContent }]
      .map(m => ({
        role: m.role,
        content: m.content,
      }));
    
    // Add user message back
    addMessage({ role: 'user', content: userContent });
    
    if (settings.streamingEnabled) {
      // Add placeholder and stream
      const assistantMsg = addMessage({ role: 'assistant', content: '', isStreaming: true });
      setStreamingMessageId(assistantMsg.id);
      
      try {
        abortControllerRef.current = new AbortController();
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody(messagesForApi)),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error('Failed to get response');
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                if (json.content) {
                  fullContent += json.content;
                  updateMessage(assistantMsg.id, { content: fullContent });
                }
              } catch {}
            }
          }
        }
        updateMessage(assistantMsg.id, { isStreaming: false });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          updateMessage(assistantMsg.id, { 
            content: 'Sorry, I had trouble responding.', 
            isStreaming: false 
          });
        }
      }
      setStreamingMessageId(null);
    } else {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody(messagesForApi)),
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        addMessage({ role: 'assistant', content: data.content });
      } catch {
        addMessage({ role: 'assistant', content: 'Sorry, I had trouble responding.' });
      }
    }
    
    setIsLoading(false);
  }, [messages, addMessage, updateMessage, deleteMessagesFrom, settings]);

  // Handle editing a user message (and regenerate response)
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    // Find the message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Delete from this message onwards
    deleteMessagesFrom(messageId);
    
    setIsLoading(true);
    
    // Get messages before the edited one
    const messagesBeforeEdit = messages.slice(0, messageIndex);
    
    // Build API messages
    const messagesForApi = [...messagesBeforeEdit, { role: 'user' as const, content: newContent }]
      .map(m => ({
        role: m.role,
        content: m.content,
      }));
    
    // Add edited user message
    addMessage({ role: 'user', content: newContent });
    
    if (settings.streamingEnabled) {
      const assistantMsg = addMessage({ role: 'assistant', content: '', isStreaming: true });
      setStreamingMessageId(assistantMsg.id);
      
      try {
        abortControllerRef.current = new AbortController();
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody(messagesForApi)),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error('Failed');
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                if (json.content) {
                  fullContent += json.content;
                  updateMessage(assistantMsg.id, { content: fullContent });
                }
              } catch {}
            }
          }
        }
        updateMessage(assistantMsg.id, { isStreaming: false });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          updateMessage(assistantMsg.id, { content: 'Sorry, I had trouble responding.', isStreaming: false });
        }
      }
      setStreamingMessageId(null);
    } else {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody(messagesForApi)),
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        addMessage({ role: 'assistant', content: data.content });
      } catch {
        addMessage({ role: 'assistant', content: 'Sorry, I had trouble responding.' });
      }
    }
    
    setIsLoading(false);
  }, [messages, addMessage, updateMessage, deleteMessagesFrom, settings]);

  // Handle delete message and all after
  const handleDeleteMessage = useCallback((messageId: string) => {
    deleteMessagesFrom(messageId);
  }, [deleteMessagesFrom]);

  // Get provider display name
  const providerName = settings.provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
  const providerEmoji = settings.provider === 'lmstudio' ? '🎛️' : '🦙';

  // Handle model selection from Model Hub
  const handleModelSelect = useCallback((modelId: string, provider: ProviderType) => {
    const providerUrl = provider === 'lmstudio' 
      ? 'http://localhost:1234' 
      : 'http://localhost:11434';
    
    updateSettings({ 
      model: modelId, 
      provider, 
      providerUrl 
    });
    
    // Recheck connection with new provider
    setTimeout(checkProviderConnection, 100);
  }, [updateSettings]);

  // Don't render until loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Show no provider prompt if no provider is connected after initial check
  const showNoProviderPrompt = hasCheckedInitialConnection && isConnected === false && messages.length === 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <Sidebar
        conversations={getConversationPreviews()}
        currentConversationId={currentConversation?.id || null}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        onSearch={searchConversations}
        onExport={exportConversations}
        onImport={importConversations}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-zinc-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg">MrSnappy</h1>
              <p className="text-xs text-zinc-500">Local AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Provider Status Bar - New Component */}
            <ProviderStatusBar
              currentProvider={settings.provider}
              onSwitchProvider={switchProvider}
              onProviderStatusChange={handleProviderStatusChange}
            />
            
            {/* Model indicator - click to open Model Hub */}
            <button 
              onClick={() => setIsModelHubOpen(true)}
              className="text-xs px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 flex items-center gap-1 transition-colors border border-zinc-700"
              title="Open Model Hub"
            >
              <Cpu className="w-3 h-3" />
              <span className="max-w-[120px] truncate">{settings.model || 'Select model'}</span>
            </button>
            
            {/* Streaming toggle */}
            <button
              onClick={() => updateSettings({ streamingEnabled: !settings.streamingEnabled })}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                settings.streamingEnabled 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {settings.streamingEnabled ? '⚡ Stream' : 'Standard'}
            </button>
            
            {/* Integrations button */}
            <button 
              onClick={() => setIsIntegrationsOpen(true)}
              className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-700 ${
                enabledIntegrations.length > 0 ? 'text-purple-400' : 'text-zinc-400'
              }`}
              title={`Integrations (${enabledIntegrations.length} active)`}
            >
              <Puzzle className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNewConversation}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-700"
              title="New chat"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-700"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </header>

        {/* Messages or No Provider Prompt */}
        <div className="flex-1 overflow-y-auto">
          {showNoProviderPrompt ? (
            <NoProviderPrompt onProviderReady={handleProviderReady} />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-6">
                <Zap className="w-10 h-10 text-zinc-900" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Hey, I'm MrSnappy ⚡</h2>
              <p className="text-zinc-500 max-w-md">
                Your local AI assistant. I run entirely on your machine using {providerName} — 
                private, fast, and always available.
              </p>
              <p className="text-xs text-amber-400 mt-4 flex items-center gap-1">
                <span>{providerEmoji}</span>
                <span>Using {settings.model || 'no model selected'}</span>
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                💾 Conversations are saved locally and persist across sessions
              </p>
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => setInput("What can you help me with?")}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors"
                >
                  What can you do?
                </button>
                <button 
                  onClick={() => setInput("Tell me about yourself")}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors"
                >
                  Who are you?
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex gap-4 mb-6 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-zinc-700' 
                      : 'bg-gradient-to-br from-amber-400 to-amber-600'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-sm">👤</span>
                    ) : (
                      <Zap className="w-4 h-4 text-zinc-900" />
                    )}
                  </div>
                  <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block rounded-2xl px-4 py-3 max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-zinc-800 rounded-tr-sm'
                        : 'bg-zinc-900 border border-zinc-800 rounded-tl-sm'
                    }`}>
                      <div className="message-content text-sm">
                        {message.role === 'assistant' ? (
                          <MarkdownRenderer 
                            content={message.content} 
                            isStreaming={message.isStreaming} 
                          />
                        ) : (
                          <span className="whitespace-pre-wrap">{message.content}</span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${
                      message.role === 'user' ? 'justify-end' : ''
                    }`}>
                      <span className="text-xs text-zinc-600">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {message.isStreaming && ' · streaming...'}
                      </span>
                      <MessageActions
                        messageId={message.id}
                        content={message.content}
                        role={message.role}
                        isStreaming={message.isStreaming}
                        onEdit={handleEditMessage}
                        onRegenerate={handleRegenerate}
                        onDelete={handleDeleteMessage}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && !streamingMessageId && (
                <div className="flex gap-4 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-zinc-900" />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-zinc-900 rounded-2xl border border-zinc-800 p-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message MrSnappy..."
                className="flex-1 bg-transparent resize-none outline-none text-sm min-h-[24px] max-h-[200px] placeholder:text-zinc-600"
                rows={1}
              />
              {isLoading && settings.streamingEnabled ? (
                <button
                  onClick={stopGeneration}
                  className="p-2 rounded-xl bg-red-500 hover:bg-red-400 transition-colors"
                  title="Stop generation"
                >
                  <span className="w-4 h-4 block text-white text-xs font-bold">■</span>
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4 text-zinc-900" />
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-600 text-center mt-2">
              MrSnappy runs locally with {providerName}. Your conversations stay on your device.
              {settings.streamingEnabled && ' ⚡'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onSwitchProvider={switchProvider}
        onResetSettings={resetSettings}
      />

      {/* Model Hub Modal */}
      <ModelHub
        isOpen={isModelHubOpen}
        onClose={() => setIsModelHubOpen(false)}
        currentModel={settings.model}
        currentProvider={settings.provider}
        onSelectModel={handleModelSelect}
      />

      {/* Integrations Settings Modal */}
      <IntegrationsSettings
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        integrations={integrations}
        onUpdateIntegrations={updateIntegrations}
      />
    </div>
  );
}
