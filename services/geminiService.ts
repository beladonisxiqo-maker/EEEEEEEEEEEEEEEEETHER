
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, ProjectState, NodeType, Role } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
            }
        ]
    }
];

// Helper to collect context, optionally filtered by a list of active Node IDs
const collectContext = (project: ProjectState, activeNodeIds?: string[]): { instruction: string, tools: any[] } => {
    const root = project.nodes[project.rootNodeId];
    if (!root) return { instruction: "System Error: Root missing.", tools: [] };

    let systemInstruction = "";
    const tools: any[] = [...systemTools];

    // Helper to check if a node should be included
    const shouldInclude = (id: string) => {
        if (!activeNodeIds) return true; // If no filter, include everything
        return activeNodeIds.includes(id) || id === project.rootNodeId; // Always include root
    };

    // Helper: Sanitize name for function declaration (only a-z, A-Z, 0-9, _)
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_');

    // Traverse and build context string...
    const traverse = (nodeId: string, depth = 0) => {
        const node = project.nodes[nodeId];
        if (!node) return;

        // Only add to context if the node is in the active stack
        if (shouldInclude(nodeId)) {
            if (node.type === NodeType.AGENT || node.type === NodeType.ROUTER) {
                systemInstruction += `\n[${node.type}: ${node.name} (ID: ${node.id})]\nInstructions: ${node.systemInstruction || 'None'}\n`;
            } else if (node.type === NodeType.TOOL) {
                 systemInstruction += `\n[Tool: ${node.name} (ID: ${node.id}) - ${node.toolType}]\n`;
                 
                 // Native Tool Injection
                 if (node.toolType === 'googleSearch') {
                     tools.push({ googleSearch: {} });
                 } else {
                     // Dynamic Tool Generation: Expose this node as a callable function to the LLM
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
        
        Object.values(project.nodes).filter(n => n.parentId === nodeId).forEach(c => traverse(c.id, depth + 1));
    };

    systemInstruction += "Current Active System Stack:\n";
    traverse(project.rootNodeId);
    
    return { instruction: systemInstruction, tools };
};

export const fetchAvailableModels = async (): Promise<{id: string, name: string}[]> => {
    try {
        // Using the SDK's model listing capability
        const response = await ai.models.list(); 
        const models = [];
        // The response is a Pager<Model> which is iterable.
        for await (const model of response) {
            // Fix: Cast model to any to access supportedGenerationMethods which might be missing in type definition
            // Filter for generateContent supported models
            if ((model as any).supportedGenerationMethods?.includes("generateContent")) {
                models.push({
                    id: model.name.replace('models/', ''),
                    name: model.displayName || model.name
                });
            }
        }
        return models;
    } catch (e) {
        console.warn("Failed to fetch dynamic models", e);
        return [];
    }
};

export const streamResponse = async (
    history: Message[],
    currentPrompt: string | null,
    currentImage: string | undefined,
    project: ProjectState,
    activeContextIds: string[] | undefined, // New param for Context Stack
    onChunk: (text: string, metadata?: any) => void,
    onToolCall: (toolCalls: any[]) => void,
    onComplete: () => void,
    onError: (error: Error) => void
) => {
    try {
        const rootNode = project.nodes[project.rootNodeId];
        const { instruction, tools } = collectContext(project, activeContextIds);

        const extendedInstruction = instruction + `
        \n\nIMPORTANT:
        1. You are the Aether Orchestrator.
        2. Only use the Nodes listed in the "Current Active System Stack".
        3. You have FULL ACCESS to execute any [Tool] listed in the stack by calling its function name.
        4. If you create a tool, you can immediately use it in the next turn.
        5. Manage architecture via 'manage_node'.
        
        VISUALIZATION CAPABILITIES:
        - To generate a chart, output a code block with language 'json-chart'.
          Structure: { type: 'bar'|'line'|'doughnut'|'radar', data: { labels: [], datasets: [{ label: '', data: [] }] }, options: {} }
        - To generate a diagram, output a code block with language 'mermaid'.
        `;

        // Map history to Gemini API format
        const contents: any[] = history.map(m => {
            if (m.role === Role.TOOL) {
                return {
                    role: 'function',
                    parts: [{ functionResponse: { name: m.toolResponse.name, response: { result: m.toolResponse.content } } }]
                };
            }
            if (m.toolCalls) {
                return {
                    role: 'model',
                    parts: m.toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } }))
                };
            }
            return {
                role: m.role === Role.USER ? 'user' : 'model',
                parts: [{ text: m.content }]
            };
        });

        // Current Turn
        const currentParts: any[] = [];
        if (currentImage) {
            const base64Data = currentImage.split(',')[1];
            const mimeType = currentImage.split(';')[0].split(':')[1];
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        if (currentPrompt) {
            currentParts.push({ text: currentPrompt });
        }

        if (currentParts.length > 0) {
            contents.push({ role: 'user', parts: currentParts });
        }

        const config: any = {
            systemInstruction: extendedInstruction,
            temperature: rootNode.temperature ?? 0.7,
            tools: tools,
        };

        const modelId = rootNode.model || 'gemini-2.5-flash';
        if (modelId.includes('thinking')) config.thinkingConfig = { thinkingBudget: 1024 };

        const responseStream = await ai.models.generateContentStream({
            model: modelId,
            contents: contents,
            config: config
        });

        let toolCalls: any[] = [];

        for await (const chunk of responseStream) {
            const c = chunk as GenerateContentResponse;
            const fc = c.candidates?.[0]?.content?.parts?.[0]?.functionCall;
            
            if (fc) {
                toolCalls.push(fc);
                continue;
            }
            if (c.text) onChunk(c.text);
            if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) onChunk("", c.candidates[0].groundingMetadata);
        }
        
        if (toolCalls.length > 0) onToolCall(toolCalls);
        else onComplete();

    } catch (error: any) {
        console.error("API Error:", error);
        onError(error);
    }
};
