'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Zap,
  HelpCircle,
  BookOpen,
  Cpu,
  Puzzle,
  Settings,
  Keyboard,
  AlertTriangle,
  Terminal,
  Download,
} from 'lucide-react';

// Help topic types
interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  topics: HelpTopic[];
}

interface HelpTopic {
  id: string;
  title: string;
  keywords: string[];
  content: React.ReactNode;
}

interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
}

// Code block with copy functionality
function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      <pre className="p-3 bg-zinc-950 rounded-lg overflow-x-auto border border-zinc-800 text-sm">
        <code className="text-amber-400 font-mono">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-zinc-400" />
        )}
      </button>
    </div>
  );
}

// Link with icon
function ExternalLinkStyled({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-2"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

// Step by step list
function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3 my-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-medium">
            {i + 1}
          </span>
          <span className="text-zinc-300 pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Callout box
function Callout({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    tip: 'bg-green-500/10 border-green-500/30 text-green-200',
  };
  const icons = {
    info: '💡',
    warning: '⚠️',
    tip: '✨',
  };
  
  return (
    <div className={`p-4 rounded-lg border my-4 ${styles[type]}`}>
      <div className="flex gap-2">
        <span>{icons[type]}</span>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

// Define all help content
const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Zap className="w-4 h-4" />,
    topics: [
      {
        id: 'first-run',
        title: 'First Run Guide',
        keywords: ['start', 'begin', 'first', 'new', 'setup', 'intro'],
        content: (
          <div className="space-y-4">
            <p>Welcome to MrSnappy! Here's how to get up and running in 5 minutes.</p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you need:</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>A computer (Windows, Mac, or Linux)</li>
              <li>Either Ollama OR LM Studio installed</li>
              <li>About 5GB of disk space for a small model</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Quick Start Steps:</h4>
            <Steps steps={[
              'Install Ollama from ollama.ai (recommended) or LM Studio',
              'Download a model (e.g., "ollama pull llama3.2" in terminal)',
              'Start the provider if it\'s not running',
              'Open MrSnappy - it will auto-detect your provider!',
              'Pick your model from the dropdown in the header',
              'Start chatting! 🎉',
            ]} />
            
            <Callout type="tip">
              <strong>New to local AI?</strong> Start with Ollama - it's easier to set up 
              and works great for beginners.
            </Callout>
          </div>
        ),
      },
      {
        id: 'what-is-mrsnappy',
        title: 'What is MrSnappy?',
        keywords: ['what', 'about', 'explain', 'purpose'],
        content: (
          <div className="space-y-4">
            <p>
              MrSnappy is a <strong className="text-zinc-200">local AI assistant</strong> that 
              runs entirely on your computer. Unlike ChatGPT or Claude, your conversations 
              never leave your device.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Key Benefits:</h4>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span>🔒</span>
                <span><strong className="text-zinc-200">100% Private</strong> - No data sent to external servers</span>
              </li>
              <li className="flex gap-2">
                <span>⚡</span>
                <span><strong className="text-zinc-200">Fast</strong> - No internet latency</span>
              </li>
              <li className="flex gap-2">
                <span>🆓</span>
                <span><strong className="text-zinc-200">Free</strong> - No subscription needed</span>
              </li>
              <li className="flex gap-2">
                <span>🔌</span>
                <span><strong className="text-zinc-200">Works Offline</strong> - Use it anywhere</span>
              </li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">How it works:</h4>
            <p>
              MrSnappy connects to AI engines (like Ollama or LM Studio) that run on your 
              computer. These engines load AI models and do all the thinking locally. 
              MrSnappy just provides a nice chat interface!
            </p>
          </div>
        ),
      },
      {
        id: 'requirements',
        title: 'System Requirements',
        keywords: ['requirements', 'specs', 'hardware', 'ram', 'gpu', 'cpu'],
        content: (
          <div className="space-y-4">
            <h4 className="font-semibold text-zinc-200">Minimum Requirements:</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>8GB RAM (for small models like Phi-3)</li>
              <li>5GB free disk space</li>
              <li>Modern CPU (Intel/AMD from 2018+ or Apple Silicon)</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Recommended for Better Performance:</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>16GB+ RAM (for larger models)</li>
              <li>NVIDIA GPU with 8GB+ VRAM (for fast inference)</li>
              <li>Apple Silicon Mac (M1/M2/M3 - excellent performance)</li>
              <li>SSD for faster model loading</li>
            </ul>
            
            <Callout type="info">
              <strong>No GPU? No problem!</strong> Ollama works great on CPU-only systems. 
              It'll just be a bit slower. Try smaller models like Phi-3 or Gemma-2 2B.
            </Callout>
            
            <h4 className="font-semibold text-zinc-200 mt-6">RAM Guide for Model Sizes:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 text-zinc-400">Model Size</th>
                    <th className="text-left py-2 text-zinc-400">RAM Needed</th>
                    <th className="text-left py-2 text-zinc-400">Example Models</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">~2B params</td>
                    <td className="py-2">4-6 GB</td>
                    <td className="py-2">Gemma-2 2B, Phi-3 Mini</td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">~7-8B params</td>
                    <td className="py-2">8-12 GB</td>
                    <td className="py-2">Llama 3.2 8B, Mistral 7B</td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">~13B params</td>
                    <td className="py-2">16 GB</td>
                    <td className="py-2">Llama 2 13B</td>
                  </tr>
                  <tr>
                    <td className="py-2">~70B params</td>
                    <td className="py-2">48+ GB</td>
                    <td className="py-2">Llama 3.1 70B</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'models',
    title: 'Models & Providers',
    icon: <Cpu className="w-4 h-4" />,
    topics: [
      {
        id: 'install-ollama',
        title: 'Installing Ollama',
        keywords: ['ollama', 'install', 'download', 'mac', 'windows', 'linux'],
        content: (
          <div className="space-y-4">
            <p>
              Ollama is the easiest way to run AI models locally. It handles everything 
              automatically - downloading, optimizing, and running models.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Installation by Platform:</h4>
            
            <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
              <h5 className="font-medium text-zinc-200 flex items-center gap-2">
                🍎 macOS
              </h5>
              <Steps steps={[
                'Go to ollama.ai and click "Download"',
                'Open the downloaded .dmg file',
                'Drag Ollama to your Applications folder',
                'Open Ollama from Applications',
              ]} />
              <p className="text-xs text-zinc-500 mt-2">
                Or use Homebrew: <code className="text-amber-400">brew install ollama</code>
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
              <h5 className="font-medium text-zinc-200 flex items-center gap-2">
                🪟 Windows
              </h5>
              <Steps steps={[
                'Go to ollama.ai and click "Download for Windows"',
                'Run the installer (.exe file)',
                'Follow the installation wizard',
                'Ollama starts automatically in the system tray',
              ]} />
            </div>
            
            <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
              <h5 className="font-medium text-zinc-200 flex items-center gap-2">
                🐧 Linux
              </h5>
              <p className="text-sm text-zinc-400 mb-2">Run this command in your terminal:</p>
              <CodeBlock code="curl -fsSL https://ollama.ai/install.sh | sh" />
            </div>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Starting Ollama:</h4>
            <p>After installation, start the Ollama server:</p>
            <CodeBlock code="ollama serve" />
            
            <Callout type="tip">
              On macOS and Windows, Ollama runs automatically in the background. 
              You only need to manually start it on Linux.
            </Callout>
          </div>
        ),
      },
      {
        id: 'install-lmstudio',
        title: 'Installing LM Studio',
        keywords: ['lmstudio', 'lm studio', 'install', 'gui', 'interface'],
        content: (
          <div className="space-y-4">
            <p>
              LM Studio is a desktop app with a graphical interface. Great if you prefer 
              clicking buttons over typing commands.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Installation:</h4>
            <Steps steps={[
              'Go to lmstudio.ai',
              'Download the version for your operating system',
              'Run the installer',
              'Open LM Studio',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Setting up for MrSnappy:</h4>
            <Steps steps={[
              'In LM Studio, go to the "Discover" tab',
              'Search for a model (try "llama 3.2" or "mistral")',
              'Click "Download" on the model you want',
              'Once downloaded, go to "Local Server" tab (left sidebar)',
              'Select your model from the dropdown',
              'Click "Start Server"',
              'MrSnappy will auto-detect LM Studio!',
            ]} />
            
            <Callout type="info">
              LM Studio's server runs on port 1234 by default. MrSnappy checks this 
              automatically, so you don't need to configure anything.
            </Callout>
          </div>
        ),
      },
      {
        id: 'download-models',
        title: 'Downloading Models',
        keywords: ['download', 'model', 'pull', 'get', 'add'],
        content: (
          <div className="space-y-4">
            <p>
              Before you can chat, you need to download at least one AI model. Here's how:
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">With Ollama (Terminal):</h4>
            <CodeBlock code="ollama pull llama3.2" />
            <p className="text-sm text-zinc-400">
              Replace "llama3.2" with any model from the <ExternalLinkStyled href="https://ollama.ai/library">Ollama Library</ExternalLinkStyled>
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Popular Models to Try:</h4>
            <div className="space-y-2 mt-3">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-200">llama3.2</span>
                  <span className="text-xs text-zinc-500">~4.7GB</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Meta's latest model. Great balance of speed and intelligence.
                </p>
                <CodeBlock code="ollama pull llama3.2" />
              </div>
              
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-200">mistral</span>
                  <span className="text-xs text-zinc-500">~4.1GB</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Fast and capable. Excellent for coding and general tasks.
                </p>
                <CodeBlock code="ollama pull mistral" />
              </div>
              
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-200">phi3</span>
                  <span className="text-xs text-zinc-500">~2.3GB</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Microsoft's small but smart model. Great for low-RAM systems.
                </p>
                <CodeBlock code="ollama pull phi3" />
              </div>
              
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-200">codellama</span>
                  <span className="text-xs text-zinc-500">~3.8GB</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Specialized for coding. Understands many programming languages.
                </p>
                <CodeBlock code="ollama pull codellama" />
              </div>
            </div>
            
            <Callout type="tip">
              Click the CPU icon in MrSnappy's header to open the Model Hub - 
              you can browse and manage models from there too!
            </Callout>
          </div>
        ),
      },
      {
        id: 'switch-models',
        title: 'Switching Models',
        keywords: ['switch', 'change', 'select', 'model', 'different'],
        content: (
          <div className="space-y-4">
            <p>You can switch models anytime without losing your conversation.</p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">How to Switch:</h4>
            <Steps steps={[
              'Click the model name in the header (shows current model)',
              'The Model Hub opens showing all your downloaded models',
              'Click on the model you want to use',
              'MrSnappy switches instantly!',
            ]} />
            
            <Callout type="info">
              Different models have different strengths. Try a coding model for programming 
              questions, or a larger model for complex reasoning.
            </Callout>
          </div>
        ),
      },
      {
        id: 'huggingface',
        title: 'Models from Hugging Face',
        keywords: ['huggingface', 'hugging face', 'custom', 'gguf'],
        content: (
          <div className="space-y-4">
            <p>
              <ExternalLinkStyled href="https://huggingface.co">Hugging Face</ExternalLinkStyled> hosts 
              thousands of AI models. You can use GGUF-format models with Ollama or LM Studio.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Finding Models:</h4>
            <Steps steps={[
              'Go to huggingface.co/models',
              'Filter by "gguf" in the search',
              'Look for models with good downloads/likes',
              'Check the model card for size and requirements',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Using with Ollama:</h4>
            <p>Create a Modelfile pointing to your downloaded GGUF:</p>
            <CodeBlock code={`# Create a file called "Modelfile"
FROM ./my-model.gguf

# Then run:
ollama create mymodel -f Modelfile`} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Using with LM Studio:</h4>
            <Steps steps={[
              'Download the .gguf file from Hugging Face',
              'Open LM Studio',
              'Go to "My Models" tab',
              'Click "Import" and select your file',
              'The model appears in your list!',
            ]} />
            
            <Callout type="warning">
              GGUF is the format that works with both Ollama and LM Studio. 
              Look for "GGUF" in the filename when downloading.
            </Callout>
          </div>
        ),
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: <Puzzle className="w-4 h-4" />,
    topics: [
      {
        id: 'web-search-setup',
        title: 'Web Search',
        keywords: ['search', 'web', 'internet', 'duckduckgo', 'browse'],
        content: (
          <div className="space-y-4">
            <p>
              Web Search lets MrSnappy look up current information online. It uses 
              DuckDuckGo by default (free, no account needed).
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you'll need:</h4>
            <ul className="list-disc list-inside text-zinc-400">
              <li>Nothing! DuckDuckGo search is free and requires no setup</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">How to Enable:</h4>
            <Steps steps={[
              'Click the puzzle piece icon (🧩) in the header',
              'Find "Web Search" in the list',
              'Toggle it ON',
              'Click Save',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Using Web Search:</h4>
            <p>Just ask questions that need current information:</p>
            <ul className="list-disc list-inside text-zinc-400 mt-2 space-y-1">
              <li>"What's the latest news about [topic]?"</li>
              <li>"Search for restaurants near [location]"</li>
              <li>"Find information about [person/company]"</li>
              <li>"What are the reviews for [product]?"</li>
            </ul>
            
            <Callout type="tip">
              MrSnappy automatically decides when to search. You don't need to say 
              "search for" - just ask naturally!
            </Callout>
          </div>
        ),
      },
      {
        id: 'gmail-setup',
        title: 'Email (Gmail) Setup',
        keywords: ['email', 'gmail', 'google', 'mail', 'oauth'],
        content: (
          <div className="space-y-4">
            <p>
              Connect your Gmail to let MrSnappy read, search, and send emails on your behalf.
            </p>
            
            <Callout type="tip">
              Once connected, you can ask MrSnappy to check your inbox, read emails, 
              search for messages, send new emails, and reply to threads!
            </Callout>
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you'll need:</h4>
            <ul className="list-disc list-inside text-zinc-400">
              <li>A Google account</li>
              <li>About 10 minutes for initial setup</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 1: Create Google Cloud Project</h4>
            <Steps steps={[
              'Go to console.cloud.google.com',
              'Click "Select Project" → "New Project"',
              'Name it "MrSnappy" (or anything you like)',
              'Click "Create"',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 2: Enable Gmail API</h4>
            <Steps steps={[
              'In your new project, go to "APIs & Services" → "Library"',
              'Search for "Gmail API"',
              'Click on it, then click "Enable"',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 3: Configure OAuth Consent Screen</h4>
            <p className="text-sm text-zinc-400">You need to set up the consent screen before creating credentials:</p>
            <Steps steps={[
              'Go to "APIs & Services" → "OAuth consent screen"',
              'Select "External" user type (unless you have a Workspace account)',
              'Fill in app name (e.g., "MrSnappy"), user support email, and developer email',
              'Click "Save and Continue" through the scopes section',
              'Under "Test users", click "Add Users" and add your Gmail address',
              'Save and complete the setup',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 4: Create OAuth Credentials</h4>
            <Steps steps={[
              'Go to "APIs & Services" → "Credentials"',
              'Click "Create Credentials" → "OAuth client ID"',
              'For Application type, select "Web application"',
              'Name it "MrSnappy Local"',
              'Under "Authorized redirect URIs", add: http://localhost:3000/api/auth/gmail/callback',
              'Click "Create"',
              'Copy your Client ID and Client Secret (you\'ll need these next!)',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 5: Connect in MrSnappy</h4>
            <Steps steps={[
              'Open Integrations (puzzle icon in the header)',
              'Find "Email" and click "Connect"',
              'Paste your Client ID and Client Secret in the form',
              'Click "Connect with Google"',
              'A popup will open - sign in with your Google account',
              'Click "Continue" even if it shows "App not verified"',
              'Allow the requested permissions',
              'The popup closes and you\'re connected!',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you can do after connecting:</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>"Check my inbox" - Lists your recent emails</li>
              <li>"Do I have any unread emails?" - Shows unread messages</li>
              <li>"Search emails from [person]" - Find specific emails</li>
              <li>"Read the email about [topic]" - Get full email content</li>
              <li>"Send an email to [person] about [topic]" - Compose and send</li>
              <li>"Reply to that email saying..." - Reply in a thread</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Troubleshooting:</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-zinc-200">"Access Denied" error:</strong>
                <span className="text-zinc-400"> Make sure you added yourself as a test user in the OAuth consent screen (Step 3).</span>
              </li>
              <li>
                <strong className="text-zinc-200">"Redirect URI mismatch":</strong>
                <span className="text-zinc-400"> Double-check the redirect URI is exactly <code className="text-amber-400">http://localhost:3000/api/auth/gmail/callback</code></span>
              </li>
              <li>
                <strong className="text-zinc-200">"App not verified" warning:</strong>
                <span className="text-zinc-400"> This is normal for personal use. Click "Advanced" → "Go to MrSnappy (unsafe)" to continue.</span>
              </li>
              <li>
                <strong className="text-zinc-200">Popup blocked:</strong>
                <span className="text-zinc-400"> Allow popups for localhost:3000 in your browser settings.</span>
              </li>
              <li>
                <strong className="text-zinc-200">"Gmail not connected" in tools:</strong>
                <span className="text-zinc-400"> Try disconnecting and reconnecting, or check that the integration is enabled in Settings.</span>
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'calendar-setup',
        title: 'Calendar (Google) Setup',
        keywords: ['calendar', 'google calendar', 'events', 'schedule', 'oauth', 'meeting'],
        content: (
          <div className="space-y-4">
            <p>
              Connect your Google Calendar to let MrSnappy view and manage your events, 
              find free time, and schedule meetings.
            </p>
            
            <Callout type="tip">
              Once connected, you can ask MrSnappy about your schedule, create events, 
              find free time slots, and manage your calendar!
            </Callout>
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you'll need:</h4>
            <ul className="list-disc list-inside text-zinc-400">
              <li>A Google account</li>
              <li>About 10 minutes for initial setup</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 1: Create Google Cloud Project</h4>
            <p className="text-sm text-zinc-400">If you already set up Gmail integration, you can use the same project!</p>
            <Steps steps={[
              'Go to console.cloud.google.com',
              'Click "Select Project" → use existing or "New Project"',
              'If new, name it "MrSnappy" (or anything you like)',
              'Click "Create"',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 2: Enable Calendar API</h4>
            <Steps steps={[
              'In your project, go to "APIs & Services" → "Library"',
              'Search for "Google Calendar API"',
              'Click on it, then click "Enable"',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 3: Configure OAuth Consent Screen</h4>
            <p className="text-sm text-zinc-400">If you set up Gmail, this may already be done:</p>
            <Steps steps={[
              'Go to "APIs & Services" → "OAuth consent screen"',
              'Select "External" user type (unless you have a Workspace account)',
              'Fill in app name (e.g., "MrSnappy"), user support email, and developer email',
              'Click "Save and Continue" through the scopes section',
              'Under "Test users", click "Add Users" and add your Google email',
              'Save and complete the setup',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 4: Create OAuth Credentials</h4>
            <p className="text-sm text-zinc-400">You can reuse Gmail credentials or create new ones:</p>
            <Steps steps={[
              'Go to "APIs & Services" → "Credentials"',
              'Click "Create Credentials" → "OAuth client ID"',
              'For Application type, select "Web application"',
              'Name it "MrSnappy Calendar" (or "MrSnappy Local" if shared with Gmail)',
              'Under "Authorized redirect URIs", add: http://localhost:3000/api/auth/calendar/callback',
              'Click "Create"',
              'Copy your Client ID and Client Secret',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Step 5: Connect in MrSnappy</h4>
            <Steps steps={[
              'Open Integrations (puzzle icon in the header)',
              'Find "Calendar" and click "Connect"',
              'Paste your Client ID and Client Secret in the form',
              'Click "Connect with Google"',
              'A popup will open - sign in with your Google account',
              'Click "Continue" even if it shows "App not verified"',
              'Allow the requested permissions',
              'The popup closes and you\'re connected!',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">What you can do after connecting:</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>"What's on my calendar today?" - Lists today's events</li>
              <li>"Show me this week's schedule" - Weekly overview</li>
              <li>"Schedule a meeting tomorrow at 3pm called Team Sync" - Creates event</li>
              <li>"When am I free this week?" - Finds available time slots</li>
              <li>"Move my 2pm meeting to 4pm" - Updates events</li>
              <li>"Cancel my meeting with [person]" - Deletes events</li>
              <li>"What's my next meeting?" - Shows upcoming events</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Natural language scheduling:</h4>
            <p className="text-zinc-400 text-sm">MrSnappy can use Google's Quick Add feature for natural phrases:</p>
            <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1">
              <li>"Add lunch with Sarah tomorrow at noon"</li>
              <li>"Schedule dentist appointment next Friday at 2pm"</li>
              <li>"Meeting with team every Monday at 10am" (creates recurring)</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Troubleshooting:</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <strong className="text-zinc-200">"Access Denied" error:</strong>
                <span className="text-zinc-400"> Make sure you added yourself as a test user in the OAuth consent screen (Step 3).</span>
              </li>
              <li>
                <strong className="text-zinc-200">"Redirect URI mismatch":</strong>
                <span className="text-zinc-400"> Double-check the redirect URI is exactly <code className="text-amber-400">http://localhost:3000/api/auth/calendar/callback</code></span>
              </li>
              <li>
                <strong className="text-zinc-200">"App not verified" warning:</strong>
                <span className="text-zinc-400"> This is normal for personal use. Click "Advanced" → "Go to MrSnappy (unsafe)" to continue.</span>
              </li>
              <li>
                <strong className="text-zinc-200">Popup blocked:</strong>
                <span className="text-zinc-400"> Allow popups for localhost:3000 in your browser settings.</span>
              </li>
              <li>
                <strong className="text-zinc-200">Using same credentials as Gmail?</strong>
                <span className="text-zinc-400"> That's fine! Just make sure you added the Calendar redirect URI to the existing credentials.</span>
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    icon: <Settings className="w-4 h-4" />,
    topics: [
      {
        id: 'streaming',
        title: 'Streaming Responses',
        keywords: ['streaming', 'stream', 'realtime', 'live'],
        content: (
          <div className="space-y-4">
            <p>
              Streaming shows AI responses as they're generated, word by word. 
              It feels more natural and lets you see if the response is going 
              in the right direction.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Toggle Streaming:</h4>
            <Steps steps={[
              'Look for the "⚡ Stream" / "Standard" button in the header',
              'Click to toggle between modes',
              'Green = streaming enabled',
            ]} />
            
            <Callout type="tip">
              Streaming also lets you stop a response mid-generation if 
              the AI is going off-track. Just click the red stop button!
            </Callout>
          </div>
        ),
      },
      {
        id: 'conversations',
        title: 'Managing Conversations',
        keywords: ['conversation', 'history', 'save', 'export', 'import', 'delete'],
        content: (
          <div className="space-y-4">
            <p>
              All your conversations are saved locally and persist across sessions.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Sidebar Features:</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><strong className="text-zinc-200">New Chat:</strong> Click the + button to start fresh</li>
              <li><strong className="text-zinc-200">Search:</strong> Use the search bar to find old conversations</li>
              <li><strong className="text-zinc-200">Delete:</strong> Hover over a conversation and click the trash icon</li>
            </ul>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Export & Import:</h4>
            <p className="text-zinc-400">
              Click the menu icon at the bottom of the sidebar to export all conversations 
              as JSON, or import previously exported conversations.
            </p>
            
            <Callout type="info">
              Your conversations are stored in your browser's local storage. 
              Clearing browser data will delete them - use export to back up!
            </Callout>
          </div>
        ),
      },
      {
        id: 'edit-regenerate',
        title: 'Edit & Regenerate',
        keywords: ['edit', 'regenerate', 'retry', 'redo', 'change'],
        content: (
          <div className="space-y-4">
            <p>
              Not happy with a response? You can edit your message or regenerate the AI's answer.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">To Edit Your Message:</h4>
            <Steps steps={[
              'Hover over your message',
              'Click the pencil (edit) icon',
              'Modify your text',
              'Press Enter or click the checkmark',
              'MrSnappy regenerates a new response',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">To Regenerate a Response:</h4>
            <Steps steps={[
              'Hover over the AI\'s response',
              'Click the refresh icon',
              'MrSnappy generates a new answer',
            ]} />
            
            <Callout type="tip">
              Regenerating with the same input often gives different results - 
              AI responses have some randomness built in!
            </Callout>
          </div>
        ),
      },
      {
        id: 'system-prompt',
        title: 'System Prompt',
        keywords: ['system', 'prompt', 'personality', 'behavior', 'custom'],
        content: (
          <div className="space-y-4">
            <p>
              The system prompt defines MrSnappy's personality and behavior. 
              Customize it to make MrSnappy work exactly how you want.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">To Change the System Prompt:</h4>
            <Steps steps={[
              'Click the settings icon (⚙️) in the header',
              'Find the "System Prompt" text area',
              'Edit the text',
              'Click "Save changes"',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Example Prompts:</h4>
            <div className="space-y-3 mt-3">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-sm font-medium text-zinc-200">Coding Assistant</p>
                <p className="text-xs text-zinc-400 mt-1">
                  "You are an expert programmer. Always provide code examples with explanations. 
                  Prefer modern best practices and clean code principles."
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-sm font-medium text-zinc-200">Concise Answers</p>
                <p className="text-xs text-zinc-400 mt-1">
                  "Be brief and direct. Give short answers unless asked for detail. 
                  Skip pleasantries and get to the point."
                </p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-sm font-medium text-zinc-200">Teacher Mode</p>
                <p className="text-xs text-zinc-400 mt-1">
                  "Explain things like I'm a beginner. Use analogies and examples. 
                  Check my understanding by asking follow-up questions."
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <Keyboard className="w-4 h-4" />,
    topics: [
      {
        id: 'keyboard-shortcuts',
        title: 'All Shortcuts',
        keywords: ['keyboard', 'shortcuts', 'hotkey', 'keys'],
        content: (
          <div className="space-y-4">
            <p>Speed up your workflow with these keyboard shortcuts:</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 text-zinc-400">Action</th>
                    <th className="text-left py-2 text-zinc-400">Shortcut</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">Send message</td>
                    <td className="py-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">Enter</kbd></td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">New line in message</td>
                    <td className="py-2"><kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">Shift</kbd> + <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">Enter</kbd></td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-2">Stop generating</td>
                    <td className="py-2">Click the red ■ button</td>
                  </tr>
                  <tr>
                    <td className="py-2">Focus input</td>
                    <td className="py-2">Just start typing!</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <Callout type="tip">
              More keyboard shortcuts coming soon! We're working on Cmd/Ctrl+K for 
              quick actions, Cmd/Ctrl+N for new chat, and more.
            </Callout>
          </div>
        ),
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: <AlertTriangle className="w-4 h-4" />,
    topics: [
      {
        id: 'no-provider',
        title: 'No Provider Detected',
        keywords: ['no provider', 'not found', 'cannot connect', 'offline'],
        content: (
          <div className="space-y-4">
            <p>
              If MrSnappy says "No AI Provider Running", it can't connect to Ollama or LM Studio.
            </p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">For Ollama:</h4>
            <Steps steps={[
              'Open a terminal/command prompt',
              'Run: ollama serve',
              'Keep the terminal open',
              'Click "Check Connection" in MrSnappy',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">For LM Studio:</h4>
            <Steps steps={[
              'Open LM Studio',
              'Go to "Local Server" tab (left sidebar)',
              'Select a model from the dropdown',
              'Click "Start Server"',
              'Click "Check Connection" in MrSnappy',
            ]} />
            
            <h4 className="font-semibold text-zinc-200 mt-6">Still not working?</h4>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>Check if another app is using port 11434 (Ollama) or 1234 (LM Studio)</li>
              <li>Try restarting the provider</li>
              <li>Make sure you have at least one model downloaded</li>
              <li>Check your firewall isn't blocking local connections</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'slow-responses',
        title: 'Slow Responses',
        keywords: ['slow', 'lag', 'performance', 'speed'],
        content: (
          <div className="space-y-4">
            <p>AI responses can be slow for several reasons. Here's how to speed things up:</p>
            
            <h4 className="font-semibold text-zinc-200 mt-6">Solutions:</h4>
            <ul className="space-y-3">
              <li>
                <strong className="text-zinc-200">Use a smaller model:</strong>
                <p className="text-zinc-400 text-sm">7B models are faster than 13B or 70B. Try llama3.2, mistral, or phi3.</p>
              </li>
              <li>
                <strong className="text-zinc-200">Close other apps:</strong>
                <p className="text-zinc-400 text-sm">AI models use a lot of RAM. Close browser tabs and other apps.</p>
              </li>
              <li>
                <strong className="text-zinc-200">Use GPU acceleration:</strong>
                <p className="text-zinc-400 text-sm">If you have an NVIDIA GPU, make sure Ollama is using it (it should auto-detect).</p>
              </li>
              <li>
                <strong className="text-zinc-200">Enable streaming:</strong>
                <p className="text-zinc-400 text-sm">Streaming shows partial results faster, making the wait feel shorter.</p>
              </li>
            </ul>
            
            <Callout type="info">
              First response is often slower because the model needs to load into memory. 
              Subsequent responses in the same session are faster.
            </Callout>
          </div>
        ),
      },
      {
        id: 'model-errors',
        title: 'Model Loading Errors',
        keywords: ['error', 'failed', 'load', 'model', 'crash'],
        content: (
          <div className="space-y-4">
            <h4 className="font-semibold text-zinc-200">"Model not found"</h4>
            <p className="text-zinc-400">
              The model you selected isn't downloaded. Run:
            </p>
            <CodeBlock code="ollama pull [model-name]" />
            
            <h4 className="font-semibold text-zinc-200 mt-6">"Out of memory"</h4>
            <p className="text-zinc-400">
              The model is too large for your system. Try a smaller model:
            </p>
            <CodeBlock code="ollama pull phi3" />
            
            <h4 className="font-semibold text-zinc-200 mt-6">"Connection refused"</h4>
            <p className="text-zinc-400">
              The provider isn't running. Start it with:
            </p>
            <CodeBlock code="ollama serve" />
            
            <h4 className="font-semibold text-zinc-200 mt-6">"Timeout"</h4>
            <p className="text-zinc-400">
              The model is taking too long to respond. This usually happens with very 
              large prompts or slow hardware. Try a shorter prompt or smaller model.
            </p>
          </div>
        ),
      },
      {
        id: 'faq',
        title: 'FAQ',
        keywords: ['faq', 'question', 'common', 'help'],
        content: (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-zinc-200">Is my data sent to the cloud?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  No! Everything runs locally. Your conversations never leave your computer.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-200">Can I use multiple models?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  Yes! Download as many models as you want and switch between them anytime.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-200">How do I update models?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  Run <code className="text-amber-400">ollama pull [model-name]</code> again to get the latest version.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-200">Where are my conversations stored?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  In your browser's local storage. Use the export feature to back them up.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-200">Can I use this offline?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  Yes! Once you have a model downloaded, you can chat completely offline.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-200">Is this free?</h4>
                <p className="text-zinc-400 text-sm mt-1">
                  Yes! MrSnappy is open source and free. The AI models are also free.
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

export default function HelpGuide({ isOpen, onClose, initialTopic }: HelpGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(initialTopic ? null : 'getting-started');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic || 'first-run');
  
  // Set initial topic when it changes
  useEffect(() => {
    if (initialTopic) {
      // Find which section contains this topic
      for (const section of helpSections) {
        const topic = section.topics.find(t => t.id === initialTopic);
        if (topic) {
          setSelectedSection(section.id);
          setSelectedTopic(topic.id);
          break;
        }
      }
    }
  }, [initialTopic]);
  
  // Filter topics based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return helpSections;
    
    const query = searchQuery.toLowerCase();
    return helpSections.map(section => ({
      ...section,
      topics: section.topics.filter(topic => 
        topic.title.toLowerCase().includes(query) ||
        topic.keywords.some(k => k.toLowerCase().includes(query))
      ),
    })).filter(section => section.topics.length > 0);
  }, [searchQuery]);
  
  // Get current topic content
  const currentTopic = useMemo(() => {
    for (const section of helpSections) {
      const topic = section.topics.find(t => t.id === selectedTopic);
      if (topic) return topic;
    }
    return null;
  }, [selectedTopic]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Help & Documentation</h2>
              <p className="text-xs text-zinc-500">Everything you need to know about MrSnappy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="px-6 py-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-zinc-800 overflow-y-auto">
            <nav className="p-4 space-y-2">
              {filteredSections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      selectedSection === section.id 
                        ? 'bg-zinc-800 text-zinc-200' 
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                    }`}
                  >
                    {section.icon}
                    <span className="flex-1">{section.title}</span>
                    {selectedSection === section.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {selectedSection === section.id && (
                    <div className="ml-6 mt-1 space-y-1">
                      {section.topics.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopic(topic.id)}
                          className={`w-full px-3 py-1.5 rounded text-sm text-left transition-colors ${
                            selectedTopic === topic.id
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {topic.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
          
          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentTopic ? (
              <div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-4">
                  {currentTopic.title}
                </h3>
                <div className="prose prose-invert prose-sm max-w-none text-zinc-400">
                  {currentTopic.content}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <HelpCircle className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-zinc-500">Select a topic from the sidebar</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-500 text-center">
            Can't find what you're looking for? Check our{' '}
            <a 
              href="https://github.com/yourusername/mrsnappy-local/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              GitHub Issues
            </a>
            {' '}or ask MrSnappy directly!
          </p>
        </div>
      </div>
    </div>
  );
}

// Export topic IDs for contextual help
export const HELP_TOPICS = {
  FIRST_RUN: 'first-run',
  WHAT_IS_MRSNAPPY: 'what-is-mrsnappy',
  REQUIREMENTS: 'requirements',
  INSTALL_OLLAMA: 'install-ollama',
  INSTALL_LMSTUDIO: 'install-lmstudio',
  DOWNLOAD_MODELS: 'download-models',
  SWITCH_MODELS: 'switch-models',
  HUGGINGFACE: 'huggingface',
  WEB_SEARCH: 'web-search-setup',
  GMAIL_SETUP: 'gmail-setup',
  CALENDAR_SETUP: 'calendar-setup',
  STREAMING: 'streaming',
  CONVERSATIONS: 'conversations',
  EDIT_REGENERATE: 'edit-regenerate',
  SYSTEM_PROMPT: 'system-prompt',
  KEYBOARD_SHORTCUTS: 'keyboard-shortcuts',
  NO_PROVIDER: 'no-provider',
  SLOW_RESPONSES: 'slow-responses',
  MODEL_ERRORS: 'model-errors',
  FAQ: 'faq',
};
