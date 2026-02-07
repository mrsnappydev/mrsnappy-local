// Chart Generation Tool for MrSnappy Local
// Uses Chart.js for beautiful, interactive charts

import { ToolDefinition, ToolResult } from './types';

export const chartTool: ToolDefinition = {
  name: 'chart_create',
  displayName: 'Create Chart',
  description: 'Create a chart or graph visualization from data. Use this when the user wants to visualize data as a bar chart, line graph, pie chart, or other chart types. Perfect for showing comparisons, trends, proportions, or distributions.',
  icon: '📊',
  integration: 'visuals',
  parameters: [
    {
      name: 'chartType',
      type: 'string',
      description: 'Type of chart: bar, line, pie, doughnut, scatter, radar, polarArea',
      required: true,
      enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'],
    },
    {
      name: 'title',
      type: 'string',
      description: 'Title for the chart',
      required: false,
    },
    {
      name: 'labels',
      type: 'array',
      description: 'Labels for data points (x-axis categories or pie segments)',
      required: true,
    },
    {
      name: 'datasets',
      type: 'array',
      description: 'Array of datasets, each with label, data array, and optional backgroundColor',
      required: true,
    },
  ],
};

export interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'polarArea';
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}

// Color palette that matches the app's zinc/amber theme
export const CHART_COLORS = [
  'rgba(251, 191, 36, 0.8)',   // amber-400
  'rgba(96, 165, 250, 0.8)',   // blue-400
  'rgba(74, 222, 128, 0.8)',   // green-400
  'rgba(251, 146, 60, 0.8)',   // orange-400
  'rgba(167, 139, 250, 0.8)',  // violet-400
  'rgba(248, 113, 113, 0.8)',  // red-400
  'rgba(45, 212, 191, 0.8)',   // teal-400
  'rgba(244, 114, 182, 0.8)',  // pink-400
];

export const CHART_BORDER_COLORS = [
  'rgba(251, 191, 36, 1)',
  'rgba(96, 165, 250, 1)',
  'rgba(74, 222, 128, 1)',
  'rgba(251, 146, 60, 1)',
  'rgba(167, 139, 250, 1)',
  'rgba(248, 113, 113, 1)',
  'rgba(45, 212, 191, 1)',
  'rgba(244, 114, 182, 1)',
];

/**
 * Execute chart creation
 */
export async function executeChartCreate(
  chartType: string,
  labels: string[],
  datasets: ChartDataset[],
  title?: string
): Promise<ToolResult> {
  const toolCallId = `chart_${Date.now()}`;
  
  try {
    // Validate inputs
    if (!['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'].includes(chartType)) {
      throw new Error(`Invalid chart type: ${chartType}`);
    }
    
    if (!Array.isArray(labels) || labels.length === 0) {
      throw new Error('Labels array is required and must not be empty');
    }
    
    if (!Array.isArray(datasets) || datasets.length === 0) {
      throw new Error('Datasets array is required and must not be empty');
    }
    
    // Enrich datasets with colors if not provided
    const enrichedDatasets = datasets.map((dataset, index) => {
      const isPieType = ['pie', 'doughnut', 'polarArea'].includes(chartType);
      
      // For pie/doughnut charts, each segment needs a color
      if (isPieType) {
        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: dataset.borderColor || labels.map((_, i) => CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length]),
          borderWidth: dataset.borderWidth ?? 2,
        };
      }
      
      // For other charts, use one color per dataset
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || CHART_COLORS[index % CHART_COLORS.length],
        borderColor: dataset.borderColor || CHART_BORDER_COLORS[index % CHART_BORDER_COLORS.length],
        borderWidth: dataset.borderWidth ?? 2,
        fill: dataset.fill ?? (chartType === 'line' ? false : undefined),
        tension: dataset.tension ?? (chartType === 'line' ? 0.3 : undefined),
      };
    });
    
    const chartConfig: ChartConfig = {
      chartType: chartType as ChartConfig['chartType'],
      title,
      labels,
      datasets: enrichedDatasets,
    };
    
    return {
      toolCallId,
      name: 'chart_create',
      success: true,
      result: chartConfig,
      displayType: 'chart',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'chart_create',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chart',
    };
  }
}

/**
 * Format chart for chat display (text fallback)
 */
export function formatChartForChat(config: ChartConfig): string {
  let output = `📊 **${config.title || 'Chart'}** (${config.chartType})\n\n`;
  
  // Simple text representation
  for (const dataset of config.datasets) {
    if (dataset.label) {
      output += `**${dataset.label}:**\n`;
    }
    for (let i = 0; i < config.labels.length; i++) {
      const value = dataset.data[i];
      output += `  • ${config.labels[i]}: ${value}\n`;
    }
    output += '\n';
  }
  
  return output;
}
