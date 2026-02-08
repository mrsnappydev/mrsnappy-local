# MEMORY.md - MrSnappy Local Project Memory

## User
- **Name:** Paul
- **Company:** Torsbotech
- **Machine:** "paul-Torsbotech-Linux-One"
  - Ryzen 9 9950X (16c/32t)
  - Dual RTX 5060 Ti
  - 128GB RAM
  - Ubuntu 24.04.3 LTS, kernel 6.17.0
  - NVMe at 88% capacity (needs cleanup)

---

## Project: MrSnappy Local

**What it is:** A privacy-focused local AI assistant that runs entirely on-device using Ollama or LM Studio. No cloud, no subscriptions, data never leaves the device.

**Repo:** `/home/node/clawd` (this workspace)
**GitHub:** https://github.com/mrsnappydev/mrsnappy-local
**Web app:** `apps/web/` (Next.js 14)

---

## Codebase Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── auth/          # OAuth (Gmail, Calendar)
│   │   ├── chat/          # Chat endpoints
│   │   ├── models/        # Model registry API
│   │   ├── providers/
│   │   │   ├── ollama/
│   │   │   │   ├── status/   # Connection check
│   │   │   │   ├── chat/     # Chat proxy
│   │   │   │   ├── library/  # Recommended models
│   │   │   │   └── pull/     # Model download
│   │   │   └── lmstudio/
│   │   ├── tools/         # Tool execution
│   │   └── memory/        # Memory extraction
│   ├── page.tsx           # Main chat UI (~1000 lines)
│   └── layout.tsx
├── components/
│   ├── ModelHub.tsx       # Model selection modal (tabs: local, recommended, storage, HF)
│   ├── ProviderStatusBar.tsx  # Provider status in header
│   ├── SettingsModal.tsx  # Settings UI
│   ├── MemoryPanel.tsx    # Memory management
│   ├── ModelRecommendations.tsx  # Task-based model suggestions
│   └── ...
├── hooks/
│   ├── useSettings.ts     # Provider/model settings (localStorage)
│   ├── useConversations.ts
│   ├── useMemory.ts
│   └── ...
└── lib/
    ├── providers/
    │   ├── ollama.ts      # Ollama client (calls /api/providers/ollama/*)
    │   ├── lmstudio.ts    # LM Studio client
    │   ├── types.ts       # ModelProvider interface
    │   └── index.ts       # Factory functions
    ├── models/
    │   ├── registry.ts    # Unified model registry
    │   ├── storage.ts     # Central storage (~MrSnappy-Models/)
    │   ├── import.ts      # Import to Ollama/LM Studio
    │   ├── capabilities.ts # Model capability definitions
    │   ├── database.ts    # Model metadata (Llama, Mistral, Qwen, etc.)
    │   └── huggingface.ts # HuggingFace API
    └── tools/
        ├── registry.ts    # Tool registry
        ├── charts.ts      # Chart.js tools
        ├── diagrams.ts    # Mermaid diagrams
        ├── web-search.ts  # DuckDuckGo search
        └── gmail.ts, calendar.ts, etc.
```

---

## Key Technical Details

### Provider System
- All provider calls go through Next.js API routes (avoids CORS)
- `OllamaProvider` calls `/api/providers/ollama/status` (server-side calls `localhost:11434/api/tags`)
- Settings stored in localStorage (`mrsnappy-settings`)
- Supports custom URLs + trusted networks for Tailscale/VPN

### Central Model Storage
- Location: `~/MrSnappy-Models/` (configurable via `MODEL_STORAGE_PATH` env)
- Registry: `.registry.json` tracks all models with metadata
- Import to Ollama: Creates Modelfile with `FROM /path/to/model.gguf`
- Import to LM Studio: Creates symlink in `~/.cache/lm-studio/models/mrsnappy-local/`

### Model Capabilities System
- Capabilities: general, coding, creative, reasoning, vision, roleplay, instruction, multilingual, long-context, fast, small, uncensored
- `database.ts` has metadata for 50+ popular models
- `getModelCapabilities()` - infers capabilities from model name
- `detectTaskCapability()` - detects task type from user message
- `getRecommendedModels()` - suggests models for a task

### Tools System
- Charts: Chart.js (bar, line, pie, scatter, etc.)
- Diagrams: Mermaid (flowchart, sequence, gantt, mindmap, etc.)
- Web Search: DuckDuckGo (no API key)
- Gmail/Calendar: OAuth integration

---

## Known Issues

### 1. Central Storage → Ollama Import Fails
**Symptom:** "Ollama couldn't parse the model path"
**Root Cause:** Ollama runs as systemd service (user: `ollama`), can't read files from user's home directory (`/home/paul/MrSnappy-Models/`)
**Fix Needed:** Either copy file to Ollama-accessible location, or use Ollama's blob import API

### 2. Model Suggestion Not Integrated
**Current State:** `detectTaskCapability()` exists but isn't used in chat flow
**Desired:** When user types "build me a research doc with charts", suggest best model for reasoning + diagramming

---

## Product Vision (from Paul)

End user should be able to:
1. Change models based on their needs
2. Have Ollama restart automatically with new model loaded
3. Central storage for all models (download once, use everywhere)
4. Pull models if needed (one-click install)
5. Get model suggestions based on task (e.g., "research with flowcharts" → suggest reasoning model)

---

## Recent Commits
- `d4d1fda` - fix: reduce provider polling frequency to prevent potential freeze
- `8142353` - fix: allow custom Ollama URL from client settings
- `6439711` - feat: add one-click Ollama model install from Model Hub
- `1f517cb` - feat: add trusted networks for Tailscale/VPN deployments
- `feb16f9` - fix: improve model import error handling for network deployments
- `65814df` - feat: add 'Use with Ollama/LM Studio' buttons to Central Storage
- `2fe20c5` - feat: Add visual creation tools (charts and diagrams)

---

## Commands

```bash
# Run dev server
cd apps/web && npm run dev

# Check Ollama status
curl http://localhost:11434/api/tags

# Pull a model
ollama pull llama3.2

# Run as Paul's machine
ssh paul@paul-machine
```

---

*Last updated: 2025-02-08*
