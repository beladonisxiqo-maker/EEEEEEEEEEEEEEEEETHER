import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, ProjectState, NodeType, Role, PROVIDERS } from "../types";

// --- System Tools Definition ---
const systemTools: any[] = [
    {
        functionDeclarations: [
            {
                name: "manage_node",
                description: "Modify the Aether system architecture. Create, update, or delete Agents, Tools, or Memories.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, enum: ["create", "update", "delete"], description: "The action to perform." },
                        nodeId: { type: Type.STRING, description: "The ID of the node. Ignored for create." },
                        parentId: { type: Type.STRING, description: "The ID of the parent node." },
                        type: { type: Type.STRING, enum: ["AGENT", "TOOL", "MEMORY", "ROUTER"], description: "The type of node." },
                        name: { type: Type.STRING, description: "Name of the node." },
                        content: { type: Type.STRING, description: "System instruction or memory content." },
                        code: { type: Type.STRING, description: "Source code for the node." },
                        language: { type: Type.STRING, enum: ["python", "javascript", "json"], description: "Language of the code." }
                    },
                    required: ["action"]
                }
            },
            {
                name: "manage_simulation",
                description: "Control the Runtime Hypervisor. Use this to fork the system into a safe simulation before applying risky changes, or to commit a simulation to live.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, enum: ["start", "commit", "abort"], description: "Start a new simulation, Commit active simulation to live, or Abort and revert." },
                        reason: { type: Type.STRING, description: "Why is this simulation being started or committed?" }
                    },
                    required: ["action"]
                }
            }
        ]
    }
];

// --- Context Collection (Shared) ---
const collectContext = (project: ProjectState, activeNodeIds?: string[]): { instruction: string, tools: any[] } => {
    const root = project.nodes[project.rootNodeId];
    if (!root) return { instruction: "System Error: Root missing.", tools: [] };

    let systemInstruction = "";
    const tools: any[] = [...systemTools];

    const shouldInclude = (id: string) => {
        if (!activeNodeIds) return true; 
        return activeNodeIds.includes(id) || id === project.rootNodeId;
    };

    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_');

    const traverse = (nodeId: string) => {
        const node = project.nodes[nodeId];
        if (!node) return;

        if (shouldInclude(nodeId)) {
            if (node.type === NodeType.AGENT || node.type === NodeType.ROUTER) {
                systemInstruction += `\n[${node.type}: ${node.name} (ID: ${node.id})]\nInstructions: ${node.systemInstruction || 'None'}\n`;
            } else if (node.type === NodeType.TOOL) {
                 systemInstruction += `\n[Tool: ${node.name} (ID: ${node.id}) - ${node.toolType}]\n`;
                 
                 if (node.toolType === 'googleSearch') {
                     tools.push({ googleSearch: {} });
                 } else {
                     const safeName = sanitizeName(node.name);
                     tools.push({
                         functionDeclarations: [{
                             name: safeName,
                             description: `Execute the custom tool '${node.name}'. Logic: ${node.code ? 'Defined in codebase' : 'Standard'}`,
                             parameters: {
                                 type: Type.OBJECT,
                                 properties: {
                                     payload: { 
                                         type: Type.STRING, 
                                         description: "Any necessary input data/arguments for this tool, formatted as a string or JSON." 
                                     }
                                 }
                             }
                         }]
                     });
                 }
            } else if (node.type === NodeType.MEMORY) {
                systemInstruction += `\n[Memory: ${node.name} (ID: ${node.id})]\nContent: ${node.memoryContent || 'Empty'}\n`;
            }
        }
        
        Object.values(project.nodes).filter(n => n.parentId === nodeId).forEach(c => traverse(c.id));
    };

    systemInstruction += "Current Active System Stack:\n";
    traverse(project.rootNodeId);
    
    return { instruction: systemInstruction, tools };
};

// --- Converter: Google Tools -> OpenAI Tools ---
const convertToolsToOpenAI = (googleTools: any[]) => {
    const openAITools: any[] = [];
    for (const t of googleTools) {
        // Skip Google Search for non-Google providers
        if (t.googleSearch) continue;
        
        if (t.functionDeclarations) {
            for (const fd of t.functionDeclarations) {
                openAITools.push({
                    type: 'function',
                    function: {
                        name: fd.name,
                        description: fd.description,
                        parameters: fd.parameters
                    }
                });
            }
        }
    }
    return openAITools;
};

// --- Driver: Google GenAI ---
const executeGoogleRequest = async (
    rootNode: any,
    config: any,
    contents: any[],
    apiKey: string,
    callbacks: { onChunk: any, onToolCall: any, onComplete: any, onError: any }
) => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Google-Specific Config Adjustments
    const modelId = rootNode.model || 'gemini-2.5-flash';
    
    // Explicitly set thinking config only if requested by model name
    if (modelId.includes('thinking')) {
        config.thinkingConfig = { thinkingBudget: 1024 };
    }

    const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: contents,
        config: config
    });

    let toolCalls: any[] = [];

    for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const parts = c.candidates?.[0]?.content?.parts || [];
        
        // Iterate over parts to properly separate text (thought) and tool calls
        if (parts.length > 0) {
            for (const part of parts) {
                if (part.text) {
                    callbacks.onChunk(part.text);
                }
                if (part.functionCall) {
                    toolCalls.push(part.functionCall);
                }
            }
        } else if (c.text) {
            // Fallback for text-only chunks without parts structure
            callbacks.onChunk(c.text);
        }

        // Handle Grounding Metadata
        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            callbacks.onChunk("", c.candidates[0].groundingMetadata);
        }
    }
    
    if (toolCalls.length > 0) callbacks.onToolCall(toolCalls);
    else callbacks.onComplete();
};

// --- Driver: Universal (OpenAI Compatible - Cerebras/Groq/LiteLLM) ---
const executeUniversalRequest = async (
    rootNode: any,
    systemInstruction: string,
    history: Message[],
    tools: any[],
    apiKey: string,
    callbacks: { onChunk: any, onToolCall: any, onComplete: any, onError: any }
) => {
    const providerConfig = PROVIDERS.find(p => p.id === rootNode.provider);
    let baseUrl = rootNode.apiBase || providerConfig?.baseUrl || 'https://api.openai.com/v1';
    
    if (rootNode.provider === 'litellm' && !baseUrl.includes('http')) {
        baseUrl = 'http://localhost:4000';
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // Smart History Mapping (handles tool_call_id linking)
    const messages: any[] = [{ role: 'system', content: systemInstruction }];
    let lastModelToolCalls: any[] = [];
    let lastModelMsgId = '';

    for (const m of history) {
        if (m.role === Role.MODEL && m.toolCalls) {
            lastModelToolCalls = m.toolCalls;
            lastModelMsgId = m.id;
            
            // OpenAI Format: Assistant message with tool_calls array
            messages.push({
                role: 'assistant',
                content: m.content || null, // Keep thought if present
                tool_calls: m.toolCalls.map((tc, i) => ({
                    id: `call_${m.id}_${i}`,
                    type: 'function',
                    function: { name: tc.name, arguments: JSON.stringify(tc.args) }
                }))
            });
        } else if (m.role === Role.TOOL) {
            // Match tool response to call ID
            const callIndex = lastModelToolCalls.findIndex(tc => tc.name === m.toolResponse.name); 
            const syntheticId = `call_${lastModelMsgId}_${callIndex !== -1 ? callIndex : 0}`;
            
            messages.push({
                role: 'tool',
                tool_call_id: syntheticId,
                content: typeof m.toolResponse.content === 'string' ? m.toolResponse.content : JSON.stringify(m.toolResponse.content)
            });
        } else {
            messages.push({
                role: m.role === Role.USER ? 'user' : 'assistant',
                content: m.content
            });
        }
    }

    try {
        const body: any = {
            model: rootNode.model,
            messages: messages,
            stream: true,
            temperature: rootNode.temperature || 0.7,
            max_tokens: 4096
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
            body.tool_choice = "auto";
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Provider Error (${response.status} @ ${baseUrl}): ${err}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let toolCallBuffer: Record<number, { id?: string, name?: string, arguments: string }> = {};

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.slice(6));
                        const delta = json.choices[0]?.delta;
                        
                        if (delta?.content) callbacks.onChunk(delta.content);
                        
                        if (delta?.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index;
                                if (!toolCallBuffer[idx]) toolCallBuffer[idx] = { arguments: '' };
                                if (tc.id) toolCallBuffer[idx].id = tc.id;
                                if (tc.function?.name) toolCallBuffer[idx].name = tc.function.name;
                                if (tc.function?.arguments) toolCallBuffer[idx].arguments += tc.function.arguments;
                            }
                        }
                    } catch (e) { }
                }
            }
        }

        // Process Completed Tool Calls
        const finalToolCalls = Object.values(toolCallBuffer).map((tc: any) => {
            try {
                return {
                    name: tc.name,
                    args: JSON.parse(tc.arguments)
                };
            } catch (e) { return null; }
        }).filter(t => t);

        if (finalToolCalls.length > 0) callbacks.onToolCall(finalToolCalls);
        else callbacks.onComplete();

    } catch (e) {
        callbacks.onError(e);
    }
};

// --- Main Export ---

export const streamResponse = async (
    history: Message[],
    currentPrompt: string | null,
    currentImage: string | undefined,
    project: ProjectState,
    activeContextIds: string[] | undefined,
    onChunk: (text: string, metadata?: any) => void,
    onToolCall: (toolCalls: any[]) => void,
    onComplete: () => void,
    onError: (error: Error) => void
) => {
    try {
        const rootNode = project.nodes[project.rootNodeId];
        const { instruction, tools } = collectContext(project, activeContextIds);

        const extendedInstruction = instruction + `
        \n\nIMPORTANT PROTOCOLS:
        1. You are the Aether Orchestrator.
        2. Active System Stack determines your available capabilities.
        3. You have FULL ACCESS to execute any [Tool] listed in the stack.
        
        SAFETY & SIMULATION:
        - Before making complex architectural changes (e.g., deleting core nodes, restructuring deeply), use 'manage_simulation' to 'start' a safe sandbox.
        - In Simulation Mode, you can make destructive changes safely.
        - Once satisfied with the simulation, call 'manage_simulation' with 'commit'.
        
        VISUALIZATION:
        - To generate a chart, output a code block with language 'json-chart'.
        - To generate a diagram, output a code block with language 'mermaid'.
        `;

        // Current Turn Addition
        const userMsg = { role: Role.USER, content: currentPrompt || '', timestamp: Date.now() };
        
        // --- API KEY RESOLUTION ---
        // In Electron/Browser, process.env is likely undefined. We must rely on the node config or a safe fallback.
        // 'process' reference is unsafe in renderer.
        let apiKey = rootNode.apiKey;
        if (!apiKey) {
            try {
                 // Try accessing via Vite's import.meta if available, or safe process access if pollyfilled
                 apiKey = (import.meta as any).env?.VITE_API_KEY || (window as any).process?.env?.API_KEY;
            } catch(e) {}
        }
        
        const safeApiKey = apiKey || (rootNode.provider === 'litellm' ? 'sk-dummy-key-for-proxy' : undefined);

        if (!safeApiKey) {
            throw new Error(`No API Key found for ${rootNode.provider}. Please configure it in the Node Inspector.`);
        }

        // --- ROUTING ---
        if (!rootNode.provider || rootNode.provider === 'google') {
            // GOOGLE DRIVER
            const googleContents: any[] = history.map(m => {
                if (m.role === Role.TOOL) {
                    // The SDK requires 'function' role for responses in history construction
                    return {
                        role: 'function',
                        parts: [{ functionResponse: { name: m.toolResponse.name, response: { result: m.toolResponse.content } } }]
                    };
                }
                if (m.toolCalls) {
                    const parts: any[] = [];
                    
                    // CRITICAL: Only add text part if content is non-empty.
                    // Adding dummy text like " " will break thought signature verification on Thinking models.
                    if (m.content && m.content.trim() !== "") {
                        parts.push({ text: m.content }); 
                    }

                    m.toolCalls.forEach(tc => {
                        parts.push({ functionCall: { name: tc.name, args: tc.args } });
                    });
                    return {
                        role: 'model',
                        parts: parts
                    };
                }
                return { role: m.role === Role.USER ? 'user' : 'model', parts: [{ text: m.content }] };
            });

            const currentParts: any[] = [];
            if (currentImage) {
                currentParts.push({ inlineData: { mimeType: currentImage.split(';')[0].split(':')[1], data: currentImage.split(',')[1] } });
            }
            if (currentPrompt) currentParts.push({ text: currentPrompt });
            if (currentParts.length > 0) googleContents.push({ role: 'user', parts: currentParts });

            await executeGoogleRequest(rootNode, { systemInstruction: extendedInstruction, temperature: rootNode.temperature, tools }, googleContents, safeApiKey, { onChunk, onToolCall, onComplete, onError });

        } else {
            // UNIVERSAL DRIVER (OpenAI/Cerebras/LiteLLM)
            const openAITools = convertToolsToOpenAI(tools);
            const effectiveHistory = [...history];
            if (currentPrompt) effectiveHistory.push({ ...userMsg, id: 'curr' }); // Add current prompt to history for driver

            await executeUniversalRequest(
                rootNode, 
                extendedInstruction, 
                effectiveHistory, 
                openAITools, 
                safeApiKey, 
                { onChunk, onToolCall, onComplete, onError }
            );
        }

    } catch (error: any) {
        console.error("Engine Error:", error);
        onError(error);
    }
};

export const fetchAvailableModels = async (provider: string, apiKey?: string): Promise<{id: string, name: string}[]> => {
    let key = apiKey;
    if (!key) {
        try {
             key = (import.meta as any).env?.VITE_API_KEY || (window as any).process?.env?.API_KEY || 'sk-dummy';
        } catch(e) { key = 'sk-dummy'; }
    }

    try {
        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.list(); 
            const models = [];
            for await (const model of response) {
                if ((model as any).supportedGenerationMethods?.includes("generateContent")) {
                    models.push({
                        id: model.name.replace('models/', ''),
                        name: model.displayName || model.name
                    });
                }
            }
            return models;
        }
        
        if (['groq', 'deepseek', 'openai', 'hyperbolic', 'litellm', 'cerebras'].includes(provider)) {
             const providerConfig = PROVIDERS.find(p => p.id === provider);
             let baseUrl = providerConfig?.baseUrl || 'https://api.openai.com/v1';
             if (provider === 'litellm') baseUrl = 'http://localhost:4000';

             const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
                 headers: { 'Authorization': `Bearer ${key}` }
             });
             if (res.ok) {
                 const data = await res.json();
                 return data.data.map((m: any) => ({ id: m.id, name: m.id }));
             }
        }
        return [];
    } catch (e) {
        console.warn("Failed to fetch models", e);
        return [];
    }
};