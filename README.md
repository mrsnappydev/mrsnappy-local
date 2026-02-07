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

## 🚀 Features

- **🦙 Multi-Provider Support** - Works with [Ollama](https://ollama.ai) and [LM Studio](https://lmstudio.ai)
- **🔄 One-Click Model Switching** - Switch between models instantly
- **⚡ Streaming Responses** - Watch responses appear in real-time
- **💾 Persistent History** - Conversations saved locally, survive browser restarts
- **🔍 Web Search Integration** - Let MrSnappy search the web (via DuckDuckGo)
- **✏️ Edit & Regenerate** - Edit messages and regenerate responses
- **🎨 Beautiful UI** - Dark theme, syntax highlighting, markdown rendering
- **📤 Export/Import** - Backup and restore your conversations
- **🔎 Search Conversations** - Find past conversations instantly
- **📚 Built-in Help** - Comprehensive documentation right in the app

### Coming Soon
- 📧 Gmail integration
- 📅 Google Calendar integration
- 🎤 Voice input
- 🖼️ Image analysis (vision models)
- 📱 Mobile apps

## 📋 Quick Start

### Prerequisites

You need **one** of the following AI backends:

**Option A: Ollama** (Recommended for beginners)
- Download from [ollama.ai](https://ollama.ai)
- Easy to use, great performance

**Option B: LM Studio** (Graphical interface)
- Download from [lmstudio.ai](https://lmstudio.ai)
- GUI for browsing and managing models

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mrsnappy-local.git
cd mrsnappy-local

# Install dependencies
npm install

# Start the development server
npm run dev
```

### First Run

1. **Start your AI backend:**

   For Ollama:
   ```bash
   # Install Ollama first, then:
   ollama serve
   
   # In another terminal, pull a model:
   ollama pull llama3.2
   ```

   For LM Studio:
   - Open LM Studio
   - Download a model from the "Discover" tab
   - Go to "Local Server" → Start Server

2. **Open MrSnappy:**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - MrSnappy auto-detects your provider!

3. **Start chatting!** 🎉

## 💻 System Requirements

### Minimum
- 8GB RAM (for small models like Phi-3)
- 5GB free disk space
- Modern CPU (2018+)

### Recommended
- 16GB+ RAM
- NVIDIA GPU with 8GB+ VRAM (or Apple Silicon)
- SSD for fast model loading

### Model Size Guide

| Model Size | RAM Needed | Example Models |
|------------|------------|----------------|
| ~2B params | 4-6 GB | Gemma-2 2B, Phi-3 Mini |
| ~7-8B params | 8-12 GB | Llama 3.2, Mistral 7B |
| ~13B params | 16 GB | Llama 2 13B |
| ~70B params | 48+ GB | Llama 3.1 70B |

## 🏗️ Architecture

```
mrsnappy-local/
├── apps/
│   └── web/                    # Next.js web interface
│       └── src/
│           ├── app/            # Routes & API endpoints
│           ├── components/     # UI components
│           ├── hooks/          # React hooks
│           ├── lib/
│           │   ├── providers/  # Ollama, LM Studio adapters
│           │   ├── integrations/ # Email, Calendar, etc.
│           │   └── tools/      # Tool framework (search, etc.)
│           └── types/          # TypeScript types
└── packages/
    └── core/                   # Shared logic (planned)
```

### Provider Abstraction

MrSnappy uses a clean provider abstraction to support multiple backends:

```typescript
interface ModelProvider {
  checkConnection(): Promise<boolean>;
  getModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): Promise<ReadableStream>;
}
```

Adding new providers (LocalAI, vLLM, etc.) is as simple as implementing this interface.

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `LMSTUDIO_URL` | `http://localhost:1234` | LM Studio API endpoint |

All settings can also be configured through the UI.

## 📖 Documentation

Click the **?** icon in MrSnappy's header to access the built-in help system, which covers:

- 🚀 Getting started guide
- 🦙 Installing Ollama & LM Studio
- 📥 Downloading and managing models
- 🔌 Setting up integrations
- ⌨️ Keyboard shortcuts
- 🔧 Troubleshooting

## 🗺️ Roadmap

### ✅ Completed
- [x] Core chat interface
- [x] Ollama integration
- [x] LM Studio integration
- [x] Streaming responses
- [x] Conversation persistence
- [x] Search conversations
- [x] Export/import
- [x] Markdown & code highlighting
- [x] Edit/regenerate messages
- [x] Web search integration
- [x] Provider auto-detection
- [x] Model Hub UI
- [x] Built-in help system

### 🚧 In Progress
- [ ] Gmail integration (OAuth)
- [ ] Calendar integration
- [ ] Weather integration

### 📋 Planned
- [ ] Voice input/output
- [ ] Image analysis (vision models)
- [ ] File management
- [ ] Memory system (remember preferences)
- [ ] Desktop app (Tauri)
- [ ] Mobile companion apps
- [ ] One-click installer
- [ ] Docker support

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development

```bash
# Start development server with hot reload
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

## 🐛 Troubleshooting

### "No AI Provider Running"
Make sure Ollama or LM Studio is running:
```bash
# For Ollama:
ollama serve

# For LM Studio:
# Open LM Studio → Local Server → Start Server
```

### Slow Responses
- Try a smaller model (phi3, gemma-2-2b)
- Close other resource-heavy applications
- Enable streaming for perceived speed improvement

### Model Loading Errors
```bash
# Re-pull the model:
ollama pull llama3.2

# Check available models:
ollama list
```

See the built-in help guide for more troubleshooting tips.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) - For making local LLMs accessible
- [LM Studio](https://lmstudio.ai) - For the excellent GUI
- [Meta](https://ai.meta.com/) - For open-sourcing Llama
- [Mistral AI](https://mistral.ai/) - For Mistral models
- The open-source AI community ❤️

---

<p align="center">
  <strong>Built with ⚡ by <a href="https://github.com/yourusername">Torsbotech</a></strong>
  <br>
  <em>Paul & MrSnappy</em>
</p>

<p align="center">
  <a href="https://github.com/yourusername/mrsnappy-local/issues">Report Bug</a>
  ·
  <a href="https://github.com/yourusername/mrsnappy-local/issues">Request Feature</a>
  ·
  <a href="https://github.com/yourusername/mrsnappy-local/discussions">Discussions</a>
</p>
