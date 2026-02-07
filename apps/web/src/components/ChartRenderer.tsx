'use client';

import { useEffect, useState, useId } from 'react';
import { Download } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Scatter, Radar, PolarArea } from 'react-chartjs-2';
import { ChartConfig } from '@/lib/tools/charts';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartRendererProps {
  config: ChartConfig;
}

export default function ChartRenderer({ config }: ChartRendererProps) {
  const [isClient, setIsClient] = useState(false);
  const chartId = useId().replace(/:/g, '-');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDownload = () => {
    // Find the canvas element within our chart container
    const container = document.getElementById(`chart-container-${chartId}`);
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${config.title || 'chart'}.png`;
      link.href = url;
      link.click();
    }
  };

  // Common options for all chart types
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(228, 228, 231)', // zinc-200
          font: {
            family: 'system-ui, sans-serif',
          },
        },
      },
      title: {
        display: !!config.title,
        text: config.title || '',
        color: 'rgb(250, 250, 250)', // zinc-50
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgb(39, 39, 42)', // zinc-800
        titleColor: 'rgb(250, 250, 250)',
        bodyColor: 'rgb(228, 228, 231)',
        borderColor: 'rgb(63, 63, 70)', // zinc-700
        borderWidth: 1,
      },
    },
    scales: ['bar', 'line', 'scatter'].includes(config.chartType) ? {
      x: {
        ticks: {
          color: 'rgb(161, 161, 170)', // zinc-400
        },
        grid: {
          color: 'rgba(63, 63, 70, 0.5)', // zinc-700 with opacity
        },
      },
      y: {
        ticks: {
          color: 'rgb(161, 161, 170)',
        },
        grid: {
          color: 'rgba(63, 63, 70, 0.5)',
        },
      },
    } : undefined,
  };

  // Radar chart specific options
  const radarOptions = {
    ...commonOptions,
    scales: {
      r: {
        ticks: {
          color: 'rgb(161, 161, 170)',
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(63, 63, 70, 0.5)',
        },
        pointLabels: {
          color: 'rgb(228, 228, 231)',
        },
      },
    },
  };

  const chartData = {
    labels: config.labels,
    datasets: config.datasets.map(ds => ({
      ...ds,
      label: ds.label || 'Data',
    })),
  };

  const renderChart = () => {
    const options = config.chartType === 'radar' ? radarOptions : commonOptions;

    switch (config.chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={options} />;
      case 'scatter':
        return <Scatter data={chartData} options={options} />;
      case 'radar':
        return <Radar data={chartData} options={radarOptions} />;
      case 'polarArea':
        return <PolarArea data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  if (!isClient) {
    return (
      <div className="my-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-zinc-500">Loading chart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400">
          <span className="text-lg">📊</span>
          <span className="font-medium">{config.title || 'Chart'}</span>
          <span className="text-xs text-amber-400/70">({config.chartType})</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-colors"
          title="Download as PNG"
        >
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
      </div>
      
      {/* Chart Container */}
      <div id={`chart-container-${chartId}`} className="p-4 bg-zinc-900/50">
        <div className="relative w-full max-h-[400px]">
          {renderChart()}
        </div>
      </div>
      
      {/* Footer with data summary */}
      <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          {config.datasets.length} dataset{config.datasets.length !== 1 ? 's' : ''} • {config.labels.length} data points
        </p>
      </div>
    </div>
  );
}
