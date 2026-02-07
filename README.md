# MrSnappy Local ⚡

A local AI assistant that runs entirely on your machine. Private, fast, and always available.

## Features

- 🏠 **100% Local** — All processing happens on your machine
- 🔒 **Privacy-First** — Your conversations never leave your device
- ⚡ **Fast** — No internet latency
- 🔌 **Multi-Provider** — Works with Ollama and LM Studio
- 🎨 **Beautiful UI** — Clean, modern chat interface
- 📦 **Easy Setup** — One-click installation (coming soon)

## Supported Backends

| Provider | API Type | Default Port | Status |
|----------|----------|--------------|--------|
| 🦙 [Ollama](https://ollama.ai) | Native Ollama API | 11434 | ✅ Supported |
| 🎛️ [LM Studio](https://lmstudio.ai) | OpenAI-compatible | 1234 | ✅ Supported |

Both providers are auto-detected on startup. Switch between them seamlessly in Settings.

## Prerequisites

**Option A: Ollama**
- [Ollama](https://ollama.ai) installed and running
- A model pulled (e.g., `ollama pull llama3.2`)

**Option B: LM Studio**
- [LM Studio](https://lmstudio.ai) installed
- A model loaded and the local server started

## Development

```bash
# Install dependencies
npm install

# Start the web app
npm run dev

# Open http://localhost:3000
```

## Architecture

```
mrsnappy-local/
├── apps/
│   ├── web/                    # Next.js web interface
│   │   └── src/
│   │       ├── app/            # Routes & API endpoints
│   │       ├── components/     # UI components
│   │       ├── hooks/          # React hooks
│   │       ├── lib/
│   │       │   └── providers/  # Model provider abstraction
│   │       └── types/          # TypeScript types
│   └── desktop/                # Tauri desktop wrapper (planned)
├── packages/
│   └── core/                   # Shared logic (planned)
└── README.md
```

## Provider Abstraction

MrSnappy uses a provider abstraction layer to support multiple LLM backends:

```typescript
// lib/providers/types.ts
interface ModelProvider {
  checkConnection(): Promise<boolean>;
  getModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): Promise<ReadableStream>;
}
```

Adding new providers (like LocalAI, vLLM, etc.) is straightforward — just implement the `ModelProvider` interface.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Default model to use |

## Roadmap

### ✅ Phase 0: Foundation
- [x] Basic chat UI
- [x] Ollama integration
- [x] Streaming responses ⚡
- [x] Conversation history persistence 💾
- [x] Settings panel ⚙️
- [x] Search across conversations 🔍
- [x] Export/Import conversations 📤📥
- [x] Markdown rendering ✨
- [x] Code syntax highlighting 🎨
- [x] Edit/regenerate messages ✏️

### ✅ Phase 1: Model Flexibility
- [x] Provider abstraction layer 🔌
- [x] LM Studio support (OpenAI-compatible) 🎛️
- [x] Auto-detect available providers ⚡
- [x] Backend selector in Settings UI
- [ ] Central model folder (unified storage)
- [ ] Download models from Huggingface
- [ ] Model compatibility matrix

### 📋 Phase 2: Full Capabilities
- [ ] Email integration (Gmail, etc)
- [ ] Calendar integration
- [ ] Web search
- [ ] File management

### 📋 Phase 3: User-Friendly Setup
- [ ] Guided onboarding wizard
- [ ] Plain-language setup questions
- [ ] Automatic OAuth flows

### 📋 Phase 4: 1-Click Deploy
- [ ] Single installer/script
- [ ] Docker compose
- [ ] Windows/Mac/Linux support

## Built by

**Torsbotech** — Paul & MrSnappy ⚡

## License

MIT
