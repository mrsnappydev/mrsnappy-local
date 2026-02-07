# MrSnappy Local 🐊⚡

**Your private AI assistant that runs entirely on your machine.** No cloud, no subscriptions, no data leaving your device. Just you and a powerful AI, having a conversation.

<p align="center">
  <img src="docs/screenshot.png" alt="MrSnappy Local Screenshot" width="800">
</p>

## ✨ Why MrSnappy Local?

| Feature | MrSnappy Local | Cloud AI Services |
|---------|----------------|-------------------|
| 🔒 **Privacy** | 100% local - data never leaves your device | Data sent to external servers |
| 💰 **Cost** | Free forever | $20+/month subscriptions |
| ⚡ **Speed** | No internet latency | Depends on connection |
| 🔌 **Offline** | Works without internet | Requires internet |
| 🎛️ **Control** | Choose any model, customize everything | Limited options |

---

## 🚀 Features

### Core Chat
- **🦙 Multi-Provider Support** - Works with [Ollama](https://ollama.ai) and [LM Studio](https://lmstudio.ai)
- **🔄 One-Click Model Switching** - Switch between models instantly
- **⚡ Streaming Responses** - Watch responses appear in real-time
- **💾 Persistent History** - Conversations saved locally
- **✏️ Edit & Regenerate** - Edit messages and regenerate responses
- **🎨 Beautiful UI** - Dark theme, syntax highlighting, markdown rendering

### 📦 Central Model Storage
- **Download once, use everywhere** - One storage location for all models
- **Import from Ollama/LM Studio** - Consolidate existing models
- **Huggingface Downloads** - Browse and download GGUF models directly
- **Model Capabilities** - See what each model is good at (coding, vision, etc.)

### 🧠 Memory System
- **Remembers you** - Stores facts, preferences, and context
- **AI-powered extraction** - Auto-detect important info from chats
- **Full control** - Add, edit, delete memories manually

### 🔧 Integrations
- **🔍 Web Search** - DuckDuckGo integration (no API key needed)
- **🖼️ Image Search** - Visual results with thumbnails
- **📧 Gmail** - Read, send, search emails (OAuth)
- **📅 Calendar** - View and manage Google Calendar events

### 📁 Project Workspaces
- **Organize your work** - Create named projects with dedicated folders
- **Safety prompts** - Confirms which project you're working on
- **File tools** - Create, read, list files in project context

### 💻 System Monitoring
- **Resource widget** - Shows RAM, CPU, GPU/VRAM usage
- **Model recommendations** - "Best for coding", "Best for low RAM"
- **Thinking indicator** - See when the AI is processing

---

## 📦 Central Model Storage — Deep Dive

### The Problem

Without central storage, you end up with:
- **Duplicate models** - Same model downloaded in both Ollama and LM Studio
- **Wasted disk space** - 7B models are 4-8GB each!
- **No organization** - Models scattered across different directories
- **Provider lock-in** - Models stuck in one provider's format

### Our Solution

MrSnappy uses a **Central Model Storage** system:

```
~/MrSnappy-Models/
├── .registry.json          # Tracks all models and their metadata
├── llama-3.2-8b-q4.gguf   # Actual model files
├── mistral-7b-q5.gguf
├── codellama-13b-q4.gguf
└── ...
```

**Benefits:**
- ✅ **Download once** - Model lives in one place
- ✅ **Use with any provider** - Import to Ollama, LM Studio, or both
- ✅ **Save disk space** - No duplicates (uses symlinks)
- ✅ **Easy backup** - One folder to backup/migrate
- ✅ **Metadata tracking** - Know where each model came from, its capabilities, etc.

### How It Works

#### 1. Downloading New Models

1. Open **Model Hub** (click model name in header)
2. Go to **Huggingface** tab
3. Search for a model (e.g., "llama 3.2")
4. Click **Download** → saved to central storage
5. Click **Import to Ollama** or **Import to LM Studio**

#### 2. Importing Existing Models

Already have models in Ollama or LM Studio? Import them!

1. Open **Model Hub** → **Central Storage** tab
2. Click **Import Existing** tab
3. Click **Scan for Models**
4. Select models to import
5. Optionally check "Delete original after import"
6. Click **Import Selected**

#### 3. Configure Providers to Use Central Storage

Want Ollama/LM Studio to use central storage even without MrSnappy?

1. Open **Model Hub** → **Central Storage** → **Configure Storage** tab
2. Click **Configure Ollama** or **Configure LM Studio**
3. This creates symlinks so providers read from central storage
4. Original directories are backed up first

### Model Capabilities

Each model shows capability badges:

| Badge | Meaning |
|-------|---------|
| 💻 Coding | Good at code generation |
| 👁️ Vision | Can understand images |
| ✍️ Creative | Good at creative writing |
| 🧮 Reasoning | Good at logic/math |
| ⚡ Fast | Optimized for speed |
| 📱 Small | Runs on limited hardware |
| 🌍 Multilingual | Multiple languages |
| 🔓 Uncensored | Fewer content restrictions |

**Filter by capability** in Model Hub to find the right model for your task!

### Recommended Models by Task

| Task | Recommended Models | Why |
|------|-------------------|-----|
| **General Chat** | Llama 3.2, Mistral | Good all-rounders |
| **Coding** | CodeLlama, DeepSeek-Coder, Qwen-Coder | Trained on code |
| **Low RAM (<8GB)** | Phi-3, Gemma-2-2B, TinyLlama | Small but capable |
| **Image Understanding** | LLaVA, BakLLaVA, Moondream | Vision capabilities |
| **Creative Writing** | Mistral, Nous-Hermes | Good at storytelling |
| **Technical/Math** | WizardMath, DeepSeek | Reasoning-focused |

---

## 📋 Quick Start

### Prerequisites

You need **one** of the following AI backends:

**Option A: Ollama** (Recommended)
```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Then start it:
ollama serve

# Pull a model:
ollama pull llama3.2
```

**Option B: LM Studio**
- Download from [lmstudio.ai](https://lmstudio.ai)
- Open → Discover → Download a model
- Local Server → Start Server

### Installation

```bash
# Clone the repository
git clone https://github.com/mrsnappydev/mrsnappy-local.git
cd mrsnappy-local

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting! 🎉

---

## 💻 System Requirements

### Minimum
- 8GB RAM (for small models)
- 5GB free disk space
- Modern CPU (2018+)

### Recommended
- 16GB+ RAM
- NVIDIA GPU with 8GB+ VRAM (or Apple Silicon)
- SSD for fast model loading

### Model Size Guide

| Model Size | RAM Needed | GPU VRAM | Examples |
|------------|------------|----------|----------|
| ~2B params | 4-6 GB | 4 GB | Phi-3, Gemma-2-2B |
| ~7B params | 8-12 GB | 6-8 GB | Llama 3.2, Mistral 7B |
| ~13B params | 16+ GB | 10+ GB | CodeLlama 13B |
| ~70B params | 48+ GB | 40+ GB | Llama 3.1 70B |

---

## 🏗️ Architecture

```
mrsnappy-local/
├── apps/
│   └── web/                      # Next.js web interface
│       └── src/
│           ├── app/              # Routes & API endpoints
│           │   └── api/
│           │       ├── auth/     # OAuth (Gmail, Calendar)
│           │       ├── chat/     # Chat endpoints
│           │       ├── models/   # Model management
│           │       ├── providers/# Provider proxies
│           │       ├── projects/ # Project management
│           │       ├── system/   # System stats
│           │       └── tools/    # Tool execution
│           ├── components/       # UI components
│           │   ├── ModelHub.tsx
│           │   ├── ModelStorage.tsx
│           │   ├── ProjectSelector.tsx
│           │   ├── MemoryPanel.tsx
│           │   └── ...
│           ├── hooks/            # React hooks
│           ├── lib/
│           │   ├── providers/    # Ollama, LM Studio adapters
│           │   ├── integrations/ # Gmail, Calendar clients
│           │   ├── models/       # Model detection, storage
│           │   ├── tools/        # Tool definitions
│           │   └── projects/     # Project types
│           └── types/            # TypeScript types
└── packages/                     # Shared packages (planned)
```

### Key Design Decisions

**1. Server-Side API Proxies**
- All provider calls go through Next.js API routes
- Avoids CORS issues (browser → Next.js → Ollama)
- Users don't need to configure `OLLAMA_ORIGINS`

**2. Provider Abstraction**
```typescript
interface ModelProvider {
  checkConnection(): Promise<boolean>;
  getModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): Promise<ReadableStream>;
}
```

**3. Tool Framework**
- Tools defined with JSON schema parameters
- LLM outputs `<tool_call>` tags when it wants to act
- Server executes tools and returns results
- Extensible — add new tools by implementing the interface

**4. Central Storage Registry**
- JSON file tracks all models with metadata
- Symlinks to share models between providers
- Survives provider reinstalls

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in `apps/web/`:

```bash
# Provider URLs (usually not needed - defaults work)
OLLAMA_URL=http://localhost:11434
LMSTUDIO_URL=http://localhost:1234

# Central storage path (optional)
MODEL_STORAGE_PATH=~/MrSnappy-Models

# Gmail OAuth (optional - for email integration)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
```

All settings can also be configured through the UI Settings panel.

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Core chat interface with streaming
- [x] Ollama + LM Studio support
- [x] Conversation persistence & search
- [x] Edit/regenerate messages
- [x] **Central Model Storage**
- [x] **Import from existing providers**
- [x] **Model capabilities & recommendations**
- [x] Huggingface model browser & downloads
- [x] Web search (DuckDuckGo)
- [x] Image search with visual results
- [x] Gmail integration (OAuth)
- [x] Calendar integration (OAuth)
- [x] Project workspaces
- [x] Memory system (remember facts)
- [x] System stats widget (RAM/CPU/GPU)
- [x] User onboarding & personalization
- [x] Built-in help system

### 📋 Planned
- [ ] Voice input/output
- [ ] Desktop app (Tauri/Electron)
- [ ] Mobile companion apps
- [ ] One-click installer
- [ ] Docker support
- [ ] Plugin system

---

## 🐛 Troubleshooting

### "No AI Provider Running"
```bash
# Start Ollama:
ollama serve

# Or start LM Studio:
# Open app → Local Server → Start Server
```

### Models Not Detected in Import
Check the paths shown in the Import UI. If your provider stores models elsewhere:
```bash
# Find Ollama models:
ls -la ~/.ollama/models/

# Find LM Studio models:
ls -la ~/.lmstudio/models/
ls -la ~/.cache/lm-studio/models/
```

### Slow Responses
- Try a smaller model (phi3, gemma-2-2b)
- Check system stats widget for resource usage
- Enable streaming for perceived speed

### Gmail/Calendar Not Connecting
- Make sure you've set up Google Cloud OAuth credentials
- Check the Help guide (? icon) for step-by-step instructions

---

## 🤝 Contributing

Contributions welcome!

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/mrsnappy-local.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes & test
npm run dev
npm run build

# Commit & push
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with ⚡ by <a href="https://torsbotech.com">Torsbotech</a></strong>
  <br>
  <em>Paul & MrSnappy</em>
</p>

<p align="center">
  <a href="https://github.com/mrsnappydev/mrsnappy-local/issues">Report Bug</a>
  ·
  <a href="https://github.com/mrsnappydev/mrsnappy-local/issues">Request Feature</a>
</p>
