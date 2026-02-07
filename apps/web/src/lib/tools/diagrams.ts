// Diagram Tool for MrSnappy Local
// Uses Mermaid.js for flowcharts, sequence diagrams, and more

import { ToolDefinition, ToolResult } from './types';

export const diagramTool: ToolDefinition = {
  name: 'diagram_create',
  displayName: 'Create Diagram',
  description: 'Create a diagram visualization such as a flowchart, sequence diagram, mindmap, Gantt chart, entity relationship diagram, or user journey map. Use this when the user wants to visualize processes, relationships, timelines, or hierarchies.',
  icon: '🔀',
  integration: 'visuals',
  parameters: [
    {
      name: 'diagramType',
      type: 'string',
      description: 'Type of diagram: flowchart, sequence, mindmap, gantt, pie, er, journey, classDiagram, stateDiagram',
      required: true,
      enum: ['flowchart', 'sequence', 'mindmap', 'gantt', 'pie', 'er', 'journey', 'classDiagram', 'stateDiagram'],
    },
    {
      name: 'title',
      type: 'string',
      description: 'Title for the diagram',
      required: false,
    },
    {
      name: 'code',
      type: 'string',
      description: 'Mermaid diagram code. Use proper Mermaid syntax for the chosen diagram type.',
      required: true,
    },
  ],
};

export interface DiagramConfig {
  diagramType: 'flowchart' | 'sequence' | 'mindmap' | 'gantt' | 'pie' | 'er' | 'journey' | 'classDiagram' | 'stateDiagram';
  title?: string;
  code: string;
}

// Example Mermaid code templates for the LLM
export const DIAGRAM_EXAMPLES = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`,
  
  sequence: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob
    B-->>A: Hi Alice`,
  
  mindmap: `mindmap
  root((Main Topic))
    Branch 1
      Sub 1.1
      Sub 1.2
    Branch 2
      Sub 2.1`,
  
  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: 2024-01-01, 7d
    Task 2: 2024-01-08, 5d`,
  
  pie: `pie title Distribution
    "Category A": 40
    "Category B": 30
    "Category C": 30`,
  
  er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains`,
  
  journey: `journey
    title User Journey
    section Getting Started
      Open app: 5: User
      Sign up: 3: User
    section Using Feature
      Try feature: 4: User`,
  
  classDiagram: `classDiagram
    class Animal {
      +String name
      +makeSound()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog`,
  
  stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Start
    Processing --> Done: Complete
    Done --> [*]`,
};

/**
 * Execute diagram creation
 */
export async function executeDiagramCreate(
  diagramType: string,
  code: string,
  title?: string
): Promise<ToolResult> {
  const toolCallId = `diagram_${Date.now()}`;
  
  try {
    // Validate diagram type
    const validTypes = ['flowchart', 'sequence', 'mindmap', 'gantt', 'pie', 'er', 'journey', 'classDiagram', 'stateDiagram'];
    if (!validTypes.includes(diagramType)) {
      throw new Error(`Invalid diagram type: ${diagramType}. Valid types are: ${validTypes.join(', ')}`);
    }
    
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new Error('Diagram code is required');
    }
    
    // Clean up the code - remove any wrapping markdown code blocks
    let cleanCode = code.trim();
    if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode.replace(/^```(?:mermaid)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const diagramConfig: DiagramConfig = {
      diagramType: diagramType as DiagramConfig['diagramType'],
      title,
      code: cleanCode,
    };
    
    return {
      toolCallId,
      name: 'diagram_create',
      success: true,
      result: diagramConfig,
      displayType: 'diagram',
    };
  } catch (error) {
    return {
      toolCallId,
      name: 'diagram_create',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create diagram',
    };
  }
}

/**
 * Format diagram for chat display (text fallback)
 */
export function formatDiagramForChat(config: DiagramConfig): string {
  let output = `🔀 **${config.title || 'Diagram'}** (${config.diagramType})\n\n`;
  output += '```mermaid\n';
  output += config.code;
  output += '\n```\n';
  return output;
}

/**
 * Generate system prompt addition for diagram tool
 */
export function getDiagramToolPrompt(): string {
  return `
When creating diagrams, use proper Mermaid.js syntax. Here are examples:

**Flowchart:**
\`\`\`
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[Other Action]
\`\`\`

**Sequence Diagram:**
\`\`\`
sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response
\`\`\`

**Mindmap:**
\`\`\`
mindmap
  root((Topic))
    Branch 1
      Detail
    Branch 2
\`\`\`

**Pie Chart:**
\`\`\`
pie title Title
    "Slice 1": 40
    "Slice 2": 60
\`\`\`
`;
}
