









export enum ViewMode {
    TERMINAL = 'TERMINAL',
    DESKTOP = 'DESKTOP', // Formerly BUILD/CHAT combined
    GRAPH = 'GRAPH'
}

export enum Role {
    USER = 'user',
    MODEL = 'model',
    SYSTEM = 'system',
    TOOL = 'tool'
}

// --- Global Type Augmentation for Electron ---
declare global {
    interface Window {
        electron?: {
            runScript: (language: 'python' | 'javascript', code: string) => Promise<string>;
            getSystemInfo: () => Promise<any>;
            platform: string;
        };
        mermaid: any;
        Chart: any;
    }
}

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    thinking?: boolean;
    groundingMetadata?: any;
    toolCalls?: any[];     
    toolResponse?: any;    
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

// --- Project Registry ---

export interface ProjectMetadata {
    id: string;
    name: string;
    description: string;
    updatedAt: number;
    createdAt: number;
    thumbnail?: 'agent' | 'code' | 'data' | 'creative'; // Icon type
}

// --- Aether Architecture Types ---

export enum NodeType {
    SYSTEM = 'SYSTEM', // New: Represents core capabilities (Editor, Terminal)
    AGENT = 'AGENT',
    TOOL = 'TOOL',
    MEMORY = 'MEMORY',
    ROUTER = 'ROUTER'
}

export type ModelProvider = 
    | 'google' 
    | 'openai' 
    | 'anthropic' 
    | 'deepseek' 
    | 'groq' 
    | 'cerebras' 
    | 'sambanova' 
    | 'huggingface' 
    | 'bytez' 
    | 'hyperbolic' 
    | 'ollama' 
    | 'litellm'
    | 'custom';

export interface AetherNode {
    id: string;
    type: NodeType;
    name: string;
    parentId: string | null;
    collapsed?: boolean;
    isActive?: boolean; // Is this node currently running/visible?
    
    // LLM Configuration
    provider?: ModelProvider;
    model?: string;
    apiBase?: string;
    apiKey?: string;
    
    // Agent/Router Properties
    systemInstruction?: string;
    temperature?: number;
    
    // Tool Properties
    toolType?: 'googleSearch' | 'api' | 'function';
    apiEndpoint?: string;
    
    // Implementation Details (New)
    code?: string;
    language?: 'python' | 'javascript' | 'typescript' | 'json' | 'text';
    
    // Memory Properties
    memoryContent?: string;
}

export interface ProjectState {
    rootNodeId: string;
    nodes: Record<string, AetherNode>;
    selectedNodeId: string;
}

// --- Comprehensive Model List ---

export const PROVIDERS: { id: ModelProvider; name: string; baseUrl?: string }[] = [
    { id: 'google', name: 'Google Gemini (Native)' },
    { id: 'litellm', name: 'LiteLLM Proxy (Local)', baseUrl: 'http://localhost:4000' },
    { id: 'cerebras', name: 'Cerebras Inference', baseUrl: 'https://api.cerebras.ai/v1' },
    { id: 'groq', name: 'Groq (Llama 3/Mixtral)', baseUrl: 'https://api.groq.com/openai/v1' },
    { id: 'openai', name: 'OpenAI (GPT-4)', baseUrl: 'https://api.openai.com/v1' },
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
    { id: 'sambanova', name: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1' },
    { id: 'hyperbolic', name: 'Hyperbolic', baseUrl: 'https://api.hyperbolic.xyz/v1' },
    { id: 'huggingface', name: 'Hugging Face' },
    { id: 'anthropic', name: 'Anthropic (Native)' },
    { id: 'ollama', name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1' },
    { id: 'custom', name: 'Custom Endpoint' }
];

export const AVAILABLE_MODELS = [
    // Google
    { provider: 'google', id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { provider: 'google', id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking' },
    { provider: 'google', id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
    
    // Cerebras (Speed)
    { provider: 'cerebras', id: 'llama3.1-70b', name: 'Llama 3.1 70B' },
    { provider: 'cerebras', id: 'llama3.1-8b', name: 'Llama 3.1 8B' },
    { provider: 'cerebras', id: 'qwen-3-32b', name: 'Qwen 3 32B (Preview)' }, 
    { provider: 'cerebras', id: 'gpt-oss-120b', name: 'GPT-OSS 120B' }, 

    // LiteLLM (Proxy)
    { provider: 'litellm', id: 'gpt-3.5-turbo', name: 'Proxy Default' },
    { provider: 'litellm', id: 'claude-3-opus', name: 'Claude 3 Opus (via Proxy)' },
    { provider: 'litellm', id: 'gemini-1.5-pro', name: 'Gemini Pro (via Proxy)' },

    // Groq (Llama 3, Mixtral - Fast)
    { provider: 'groq', id: 'llama3-70b-8192', name: 'Llama 3 70B (Groq)' },
    { provider: 'groq', id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)' },

    // SambaNova
    { provider: 'sambanova', id: 'Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B (SambaNova)' },

    // Major Paid Providers
    { provider: 'anthropic', id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
    { provider: 'openai', id: 'gpt-4o', name: 'GPT-4o' },
    { provider: 'deepseek', id: 'deepseek-reasoner', name: 'DeepSeek R1' },
];

export const DEFAULT_PROJECT: ProjectState = {
    rootNodeId: 'root',
    selectedNodeId: 'root',
    nodes: {
        'root': {
            id: 'root',
            type: NodeType.SYSTEM,
            name: 'Aether_Kernel',
            parentId: null,
            isActive: true,
            provider: 'google',
            model: 'gemini-2.5-flash'
        },
        'sys_local_setup': {
            id: 'sys_local_setup',
            type: NodeType.MEMORY,
            name: 'LOCAL_SETUP.sh',
            parentId: 'root',
            language: 'text',
            memoryContent: `#!/bin/bash
# --- Aether Local Bridge Setup ---
# This script creates a secure environment for your API keys and installs the necessary proxies.

echo "[Aether] Initializing Local Environment..."

# 1. Create Virtual Environment
python3 -m venv venv_aether
source venv_aether/bin/activate

# 2. Install Dependencies
pip install litellm 'google-generativeai>=0.8.3' openai

# 3. Export Secure Keys (Add your specific keys here)
# WARNING: Keep this file private.
export GEMINI_API_KEY="AIzaSyBS..." 
export CEREBRAS_API_KEY="csk-..." 

# 4. Start LiteLLM Proxy
# This bridges Aether (Browser) to your terminal's authenticated environment.
# Running on http://0.0.0.0:4000
echo "[Aether] Starting Proxy Gateway..."
litellm --model gemini/gemini-1.5-pro --port 4000

# Usage:
# 1. Select 'LiteLLM Proxy' in Aether Node Inspector.
# 2. Set Base URL to http://localhost:4000 (default).
`
        },
        'agent_core': {
            id: 'agent_core',
            type: NodeType.AGENT,
            name: 'Orchestrator',
            parentId: 'root',
            provider: 'google',
            model: 'gemini-2.5-flash',
            systemInstruction: 'You are the Aether Orchestrator. You manage the lifecycle of nodes and respond to user intent.',
            temperature: 0.7
        },
        'mem_readme': {
            id: 'mem_readme',
            type: NodeType.MEMORY,
            name: 'ARCHITECTURE.md',
            parentId: 'root',
            language: 'text',
            memoryContent: `# Aether Studio: Architecture & Delegation Protocol

## 1. The Hub-and-Spoke Model
Aether uses a centralized orchestration model known as "Hub-and-Spoke".

### The Hub (Orchestrator)
The Active Agent (usually the Orchestrator) acts as the **Executive Hub**. It receives the user's intent.
- It has visibility into all available "Spokes" (Tools, Sub-Agents, Memory Nodes).
- It does NOT "hand off" the chat. Instead, it **invokes** the spokes as tools.

### The Spokes (Specialized Teams)
Agents defined in the node tree are treated as **Tools** by the Hub.
- **Example:** You have a "Python_Expert" agent node.
- **Delegation:** When the Orchestrator needs code, it calls the function \`Python_Expert(payload="write a sort function")\`.
- **Execution:** The system momentarily "wakes up" the Python_Expert, runs its specific system prompt against the payload, and returns the text result to the Orchestrator.
- **Synthesis:** The Orchestrator presents the result to the user.

## 2. Context Injection (The Stack)
The "Active System Stack" (visible in the right panel) determines which Nodes are visible to the Hub.
- If a Node is **checked**, its System Instruction and Tool Definition are injected into the Hub's context window.
- If a Node is **unchecked**, it is effectively offline/invisible.

## 3. Runtime Environment
Aether runs a sandboxed JavaScript runtime directly in the browser.
- **Global Scope:** Agents have access to \`window.Chart\` (Visualization), \`window.mermaid\` (Diagrams), \`window.math\` (Calc), and \`window._\` (Lodash).
- **Visualization:** To render a chart, the Agent outputs a code block tagged \`json-chart\`. To render a diagram, it uses \`mermaid\`.

## 4. LiteLLM / Localhost Integration
To use local models or specialized API keys without entering them in the browser:
1. Open the **LOCAL_SETUP.sh** memory node.
2. Run the script in your terminal to start the LiteLLM proxy.
3. In Aether, set a Node's provider to **LiteLLM Proxy**.

---
*System Architecture v2.2*`
        }
    }
};