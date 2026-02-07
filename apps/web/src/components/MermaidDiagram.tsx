'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Copy, Check, AlertCircle } from 'lucide-react';
import { DiagramConfig } from '@/lib/tools/diagrams';

interface MermaidDiagramProps {
  config: DiagramConfig;
}

export default function MermaidDiagram({ config }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const renderDiagram = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Dynamic import of mermaid for client-side only
      const mermaid = (await import('mermaid')).default;
      
      // Initialize mermaid with dark theme
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          // Customize colors to match app theme
          primaryColor: '#fbbf24', // amber-400
          primaryTextColor: '#fafafa', // zinc-50
          primaryBorderColor: '#78716c', // stone-500
          lineColor: '#a1a1aa', // zinc-400
          secondaryColor: '#3f3f46', // zinc-700
          tertiaryColor: '#27272a', // zinc-800
          background: '#18181b', // zinc-900
          mainBkg: '#27272a', // zinc-800
          nodeBorder: '#52525b', // zinc-600
          clusterBkg: '#3f3f46', // zinc-700
          titleColor: '#fafafa',
          edgeLabelBackground: '#27272a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
        },
        sequence: {
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50,
          boxTextMargin: 5,
        },
        gantt: {
          titleTopMargin: 25,
          barHeight: 20,
          barGap: 4,
          topPadding: 50,
          leftPadding: 75,
        },
      });

      // Generate unique ID for this render
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(id, config.code);
      setSvg(renderedSvg);
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
    } finally {
      setIsLoading(false);
    }
  }, [config.code]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  const handleDownloadSVG = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${config.title || 'diagram'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!svg || !containerRef.current) return;
    
    try {
      // Create an image from the SVG
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        // Create canvas and draw the image
        const canvas = document.createElement('canvas');
        const scale = 2; // Higher resolution
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Fill with dark background
        ctx.fillStyle = '#18181b'; // zinc-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        // Download
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${config.title || 'diagram'}.png`;
        link.href = pngUrl;
        link.click();
        
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (err) {
      console.error('PNG download error:', err);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(config.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="my-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-6">
        <div className="h-48 flex items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-500">
            <div className="w-5 h-5 border-2 border-zinc-500 border-t-amber-400 rounded-full animate-spin" />
            <span>Rendering diagram...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 rounded-xl bg-red-500/10 border border-red-500/30 overflow-hidden">
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Diagram Error</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-300 mb-3">{error}</p>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-2">Code:</p>
            <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
              {config.code}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-violet-500/10 border-b border-violet-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-violet-400">
          <span className="text-lg">🔀</span>
          <span className="font-medium">{config.title || 'Diagram'}</span>
          <span className="text-xs text-violet-400/70">({config.diagramType})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Copy Mermaid code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Code
              </>
            )}
          </button>
          <button
            onClick={handleDownloadSVG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Download as SVG"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Download as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </button>
        </div>
      </div>
      
      {/* Diagram Container */}
      <div 
        ref={containerRef}
        className="p-4 bg-zinc-900/50 overflow-x-auto"
      >
        <div 
          className="flex justify-center min-w-fit"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          {config.diagramType} diagram • Powered by Mermaid.js
        </p>
      </div>
    </div>
  );
}
