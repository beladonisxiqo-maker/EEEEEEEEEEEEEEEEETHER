
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_PROJECT, ProjectState, Message, Role, NodeType, AetherNode, ChatSession, ProjectMetadata } from './types';
import { streamResponse } from './services/aiEngine.ts';
import TerminalPanel from './components/TerminalPanel';
import CodeEditor from './components/CodeEditor';
import CanvasView from './components/CanvasView';
import ChatView from './components/ChatView';
import ChatOverlay from './components/ChatOverlay';
import Sidebar from './components/Sidebar';
import Icons from './components/Icon';
import Resizer from './components/Resizer';
import ErrorBoundary from './components/ErrorBoundary';
import ProjectDashboard from './components/ProjectDashboard';

const uuid = () => Math.random().toString(36).substr(2, 9);

// Async Function Constructor for dynamic execution
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const App: React.FC = () => {
    // --- PROJECT REGISTRY MANAGEMENT ---
    const [projectList, setProjectList] = useState<ProjectMetadata[]>(() => {
        const saved = localStorage.getItem('aether_project_index');
        if (saved) return JSON.parse(saved);
        return [];
    });

    const [activeProjectId, setActiveProjectId] = useState<string>(() => {
        return localStorage.getItem('aether_active_project_id') || '';
    });

    const [isDashboardOpen, setIsDashboardOpen] = useState(false);

    // --- SESSION & PROJECT STATE ---
    // These states are now "Active Project" states. They are hydrated when activeProjectId changes.
    
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('default');
    const [project, setProject] = useState<ProjectState>(DEFAULT_PROJECT);

    // --- INITIALIZATION & MIGRATION LOGIC ---
    useEffect(() => {
        // If no project is active, or no projects exist, we might need to migrate legacy data
        // or create a default one.
        
        if (projectList.length === 0) {
            // Check for legacy data
            const legacyProject = localStorage.getItem('aether_universal_v2');
            const legacySessions = localStorage.getItem('aether_sessions_v1');
            
            if (legacyProject) {
                // MIGRATION: Create a "Legacy" project from existing data
                const legacyId = uuid();
                const legacyMetadata: ProjectMetadata = {
                    id: legacyId,
                    name: 'Migrated Workspace',
                    description: 'Imported from previous version.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    thumbnail: 'agent'
                };
                
                const newIndex = [legacyMetadata];
                localStorage.setItem('aether_project_index', JSON.stringify(newIndex));
                localStorage.setItem(`aether_project_${legacyId}`, legacyProject);
                localStorage.setItem(`aether_sessions_${legacyId}`, legacySessions || '[]');
                
                setProjectList(newIndex);
                setActiveProjectId(legacyId);
                return;
            } else {
                // FRESH START: Create default project
                const defaultId = uuid();
                const defaultMeta: ProjectMetadata = {
                    id: defaultId,
                    name: 'New Aether Project',
                    description: 'A fresh canvas for intelligence.',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    thumbnail: 'creative'
                };
                const newIndex = [defaultMeta];
                localStorage.setItem('aether_project_index', JSON.stringify(newIndex));
                localStorage.setItem(`aether_project_${defaultId}`, JSON.stringify(DEFAULT_PROJECT));
                localStorage.setItem(`aether_sessions_${defaultId}`, JSON.stringify([{
                     id: 'default',
                     title: 'System Init',
                     messages: [],
                     createdAt: Date.now(),
                     updatedAt: Date.now()
                }]));

                setProjectList(newIndex);
                setActiveProjectId(defaultId);
                return;
            }
        } else if (!activeProjectId) {
            // If we have projects but no active one selected (edge case), select the first one
            setActiveProjectId(projectList[0].id);
        }
    }, []); // Run once on mount

    // --- DATA LOADING EFFECT ---
    // When activeProjectId changes, load the data for that project
    useEffect(() => {
        if (!activeProjectId) return;

        // 1. Load Project State
        const savedProject = localStorage.getItem(`aether_project_${activeProjectId}`);
        if (savedProject) {
            setProject(JSON.parse(savedProject));
        } else {
            // Fallback if key missing
            setProject(DEFAULT_PROJECT);
        }

        // 2. Load Sessions
        const savedSessions = localStorage.getItem(`aether_sessions_${activeProjectId}`);
        if (savedSessions) {
            const parsed = JSON.parse(savedSessions);
            setSessions(parsed);
            setActiveSessionId(parsed[0]?.id || 'default');
        } else {
            setSessions([{
                 id: 'default',
                 title: 'New Session',
                 messages: [],
                 createdAt: Date.now(),
                 updatedAt: Date.now()
            }]);
            setActiveSessionId('default');
        }

        localStorage.setItem('aether_active_project_id', activeProjectId);
        setIsDashboardOpen(false);

    }, [activeProjectId]);

    // --- DATA SAVING EFFECTS ---
    // Persist changes to the active project's keys
    
    // Save Sessions
    useEffect(() => {
        if (activeProjectId) {
            localStorage.setItem(`aether_sessions_${activeProjectId}`, JSON.stringify(sessions));
        }
    }, [sessions, activeProjectId]);

    // Save Project State (Sim Check Included)
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedProject, setSimulatedProject] = useState<ProjectState | null>(null);

    useEffect(() => {
        if (activeProjectId && !isSimulating) {
            localStorage.setItem(`aether_project_${activeProjectId}`, JSON.stringify(project));
            
            // Also update last modified timestamp in registry
            setProjectList(prev => {
                const updated = prev.map(p => p.id === activeProjectId ? { ...p, updatedAt: Date.now() } : p);
                localStorage.setItem('aether_project_index', JSON.stringify(updated));
                return updated;
            });
        }
    }, [project, activeProjectId, isSimulating]);

    // --- PROJECT MANAGEMENT HANDLERS ---

    const handleCreateProject = (name: string, desc: string, type: 'agent' | 'code' | 'data' | 'creative') => {
        const newId = uuid();
        
        // Prepare Initial State based on Type (Optional: could have different templates)
        const initialState = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
        initialState.nodes.root.name = name.replace(/\s+/g, '_');

        // Save new data keys
        localStorage.setItem(`aether_project_${newId}`, JSON.stringify(initialState));
        localStorage.setItem(`aether_sessions_${newId}`, JSON.stringify([{
             id: 'default',
             title: 'Initialization',
             messages: [],
             createdAt: Date.now(),
             updatedAt: Date.now()
        }]));

        // Update Registry
        const newMeta: ProjectMetadata = {
            id: newId,
            name: name,
            description: desc,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            thumbnail: type
        };
        const newIndex = [newMeta, ...projectList];
        
        setProjectList(newIndex);
        localStorage.setItem('aether_project_index', JSON.stringify(newIndex));
        
        // Switch to it
        setActiveProjectId(newId);
    };

    const handleDeleteProject = (id: string) => {
        if (projectList.length <= 1) {
            alert("Cannot delete the last project.");
            return;
        }
        
        if (confirm("Are you sure you want to delete this workspace? This cannot be undone.")) {
            const newIndex = projectList.filter(p => p.id !== id);
            setProjectList(newIndex);
            localStorage.setItem('aether_project_index', JSON.stringify(newIndex));
            
            // Cleanup keys
            localStorage.removeItem(`aether_project_${id}`);
            localStorage.removeItem(`aether_sessions_${id}`);

            // If we deleted the active one, switch
            if (activeProjectId === id) {
                setActiveProjectId(newIndex[0].id);
            }
        }
    };

    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const messages = activeSession?.messages || [];

    const updateSessionMessages = (sessionId: string, fn: (prev: Message[]) => Message[]) => {
        setSessions(prev => prev.map(s => 
            s.id === sessionId 
            ? { ...s, messages: fn(s.messages), updatedAt: Date.now() } 
            : s
        ));
    };

    const setMessages = (fn: (prev: Message[]) => Message[]) => {
        updateSessionMessages(activeSessionId, fn);
    };

    const handleNewSession = () => {
        const newId = uuid();
        const newSession: ChatSession = {
            id: newId,
            title: 'New Session',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newId);
    };

    const handleDeleteSession = (id: string) => {
        const newSessions = sessions.filter(s => s.id !== id);
        if (newSessions.length === 0) {
             handleNewSession();
        } else {
            setSessions(newSessions);
            if (activeSessionId === id) {
                setActiveSessionId(newSessions[0].id);
            }
        }
    };

    const handleRenameSession = (id: string, newTitle: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    const [isLoading, setIsLoading] = useState(false);
    
    // View States
    const [activeView, setActiveView] = useState<'graph' | 'code' | 'chat'>('graph');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
    const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
    const [terminalTab, setTerminalTab] = useState<'output' | 'problems' | 'debug'>('output');
    const [leftWidth, setLeftWidth] = useState(260);
    const [bottomHeight, setBottomHeight] = useState(200);

    const appContainerRef = useRef<HTMLDivElement>(null);
    const isResizingLeft = useRef(false);
    const isResizingBottom = useRef(false);

    // The Active Project is either the Sim or the Live one
    const activeProject = isSimulating && simulatedProject ? simulatedProject : project;

    // State Setters need to target the correct runtime
    const setActiveProject = (newValue: React.SetStateAction<ProjectState>) => {
        if (isSimulating) {
            setSimulatedProject(newValue);
        } else {
            setProject(newValue);
        }
    };

    // Context Stack State
    const [activeContextIds, setActiveContextIds] = useState<string[]>([]);

    // Initialize context stack
    useEffect(() => {
        if (activeContextIds.length === 0 && activeProject.nodes) {
            setActiveContextIds(Object.keys(activeProject.nodes));
        }
    }, [activeProject.nodes]);

    // --- Handlers for Simulation ---

    const startSimulation = () => {
        // Deep copy current project to sim
        setSimulatedProject(JSON.parse(JSON.stringify(project)));
        setIsSimulating(true);
        addLog('HYPERVISOR', 'Simulation Runtime Initialized. All changes are sandboxed.', 'success');
    };

    const commitSimulation = () => {
        if (simulatedProject) {
            setProject(simulatedProject);
            setIsSimulating(false);
            setSimulatedProject(null);
            addLog('HYPERVISOR', 'Simulation committed to Live Production.', 'success');
        }
    };

    const abortSimulation = () => {
        setIsSimulating(false);
        setSimulatedProject(null);
        addLog('HYPERVISOR', 'Simulation aborted. State reverted.', 'info');
    };

    // --- Resizing Logic ---
    const startResizing = (direction: 'left' | 'bottom') => (e: React.MouseEvent) => {
        e.preventDefault();
        if (direction === 'left') isResizingLeft.current = true;
        if (direction === 'bottom') isResizingBottom.current = true;
        document.body.style.cursor = direction === 'bottom' ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const stopResizing = useCallback(() => {
        isResizingLeft.current = false;
        isResizingBottom.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!appContainerRef.current) return;
        const containerRect = appContainerRef.current.getBoundingClientRect();

        if (isResizingLeft.current) {
            const newWidth = e.clientX - containerRect.left - 48; 
            if (newWidth > 150 && newWidth < 600) setLeftWidth(newWidth);
        }
        if (isResizingBottom.current) {
            const newHeight = containerRect.bottom - e.clientY;
            if (newHeight > 32 && newHeight < containerRect.height - 100) {
                setBottomHeight(newHeight);
                if (isTerminalCollapsed && newHeight > 40) setIsTerminalCollapsed(false);
            }
        }
    }, [isTerminalCollapsed]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [handleMouseMove, stopResizing]);

    const addLog = (source: string, text: string, type: 'info' | 'success' | 'error' = 'info') => {
        const id = Date.now().toString();
        const msg: Message = { id, role: Role.SYSTEM, timestamp: Date.now(), content: `[${source}] ${text}` };
        setMessages(prev => [...prev, msg]);
    };

    // Smart Create Node
    const createNode = (type: NodeType) => {
        const newId = uuid();
        const selected = activeProject.nodes[activeProject.selectedNodeId];
        let parentId = activeProject.rootNodeId;
        let parentName = "Kernel";

        if (selected && (selected.type === NodeType.AGENT || selected.type === NodeType.ROUTER || selected.type === NodeType.SYSTEM || selected.type === NodeType.TOOL)) {
            parentId = selected.id;
            parentName = selected.name;
        }

        const name = type === NodeType.AGENT ? 'New_Agent' : type === NodeType.TOOL ? 'New_Tool' : 'New_Memory';
        const newNode: AetherNode = {
            id: newId, 
            parentId: parentId, 
            type: type, 
            name: name,
            provider: 'google', 
            model: 'gemini-2.5-flash', 
            collapsed: false,
            code: type === NodeType.TOOL ? 
`// Runtime Tool Logic (JavaScript)
print("Tool invoked with args: " + JSON.stringify(args));
return "Execution Complete";` : undefined,
            language: type === NodeType.TOOL ? 'javascript' : undefined
        };

        setActiveProject(prev => ({ ...prev, nodes: { ...prev.nodes, [newId]: newNode }, selectedNodeId: newId }));
        setActiveContextIds(prev => [...prev, newId]);
        
        addLog('SYSTEM', `Created ${type} nested under ${parentName} (${isSimulating ? 'SIM' : 'LIVE'})`, 'success');
        return { newNode, parentName };
    };

    const handleNodeSelect = (id: string) => setActiveProject(p => ({...p, selectedNodeId: id}));

    const handleNodeOpen = (id: string) => {
        setActiveProject(p => ({...p, selectedNodeId: id}));
        const node = activeProject.nodes[id];
        if (node && node.type === NodeType.SYSTEM && id === 'root') setActiveView('graph');
        else setActiveView('code');
    };

    const generateFullSystemContext = () => {
        let exportText = `# Aether Project Snapshot: ${new Date().toISOString()}\n\n`;
        exportText += `## Active Architecture\n`;
        
        Object.values(activeProject.nodes).filter(n => n.type === NodeType.AGENT || n.type === NodeType.ROUTER).forEach(agent => {
            exportText += `- **${agent.name}** (${agent.model})\n`;
            exportText += `  Instructions: ${agent.systemInstruction || 'None'}\n\n`;
        });

        Object.values(activeProject.nodes).filter(n => n.type === NodeType.TOOL).forEach(tool => {
            exportText += `#### ${tool.name} (${tool.language})\n`;
            exportText += "```javascript\n" + (tool.code || "// No code") + "\n```\n\n";
        });

        Object.values(activeProject.nodes).filter(n => n.type === NodeType.MEMORY).forEach(mem => {
            exportText += `#### ${mem.name}\n`;
            exportText += "```\n" + (mem.memoryContent || "") + "\n```\n\n";
        });

        const blob = new Blob([exportText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Aether_System_Snapshot_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        
        addLog('SYSTEM', 'Full project snapshot exported to local machine.', 'success');
    };

    // Unified Chat Processor with Simulation Support
    const processChatTurn = async (
        targetSessionId: string,
        currentHistory: Message[], 
        currentPrompt: string | null, 
        currentImage: string | undefined, 
        contextFilter?: string[],
        overrideProject?: ProjectState
    ) => {
        const aiMsgId = (Date.now() + 1).toString();
        
        updateSessionMessages(targetSessionId, prev => [...prev, { id: aiMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), thinking: true }]);

        // Determine runtime state: If we are recursion, use override. Else use current Active Project (Sim or Live).
        const runtimeProject = overrideProject || activeProject; 
        const stack = contextFilter || activeContextIds;

        let accumulatedText = "";

        await streamResponse(
            currentHistory, currentPrompt, currentImage, runtimeProject, stack,
            (chunk, metadata) => {
                if (chunk) accumulatedText += chunk;
                updateSessionMessages(targetSessionId, prev => prev.map(m => m.id === aiMsgId ? { ...m, thinking: false, content: m.content + (chunk || ""), groundingMetadata: metadata } : m));
            },
            async (toolCalls) => {
                updateSessionMessages(targetSessionId, prev => prev.map(m => m.id === aiMsgId ? { ...m, thinking: false, toolCalls, content: m.content || "Executing..." } : m));
                
                let nextProject = { ...runtimeProject, nodes: { ...runtimeProject.nodes } };
                let nextStack = [...stack];
                let modified = false;
                let triggeredSimulationChange = false;

                const historyContent = accumulatedText || "Thought process complete. Executing tool.";
                const newHistory: Message[] = [...currentHistory, { id: aiMsgId, role: Role.MODEL, content: historyContent, toolCalls, timestamp: Date.now() }];
                
                for (const call of toolCalls) {
                     let result = 'Action failed';
                     
                     // --- SIMULATION MANAGER ---
                     if (call.name === 'manage_simulation') {
                         const args: any = call.args;
                         if (args.action === 'start') {
                             startSimulation();
                             triggeredSimulationChange = true; // Switch happens in outer scope, but we need to flag it here
                             // For recursion, we need to grab the NEW Sim Project which is a copy of current
                             // But React state updates are async. 
                             // We will manually create the clone for the next recursive step.
                             const simClone = JSON.parse(JSON.stringify(nextProject));
                             nextProject = simClone; // recursion will use this
                             result = "Simulation Runtime Started. You are now operating in a sandboxed copy.";
                         } else if (args.action === 'commit') {
                             commitSimulation();
                             // We don't update nextProject here because commit reverts us to 'Project' (which is now updated)
                             // but in the recursion chain, we just return success.
                             triggeredSimulationChange = true;
                             result = "Simulation Committed to Live.";
                         } else if (args.action === 'abort') {
                             abortSimulation();
                             triggeredSimulationChange = true;
                             result = "Simulation Aborted.";
                         }
                     }
                     // --- NODE MANAGER ---
                     else if (call.name === 'manage_node') {
                         const args: any = call.args;
                         try {
                             if (args.action === 'create') {
                                 const newId = uuid();
                                 const parentId = args.parentId || nextProject.rootNodeId;
                                 
                                 if (!nextProject.nodes[parentId]) throw new Error(`Parent ${parentId} not found`);
                                 
                                 const newNode: AetherNode = {
                                     id: newId,
                                     parentId,
                                     type: args.type as NodeType,
                                     name: args.name || 'AI_Generated_Node',
                                     provider: 'google',
                                     model: 'gemini-2.5-flash',
                                     systemInstruction: args.content,
                                     memoryContent: args.content,
                                     code: args.code || (args.type === NodeType.TOOL ? 
`// AI Generated Tool Logic
print("Tool ${args.name || 'Script'} executing...");
return "Tool logic executed successfully.";` : undefined),
                                     language: args.language || 'javascript',
                                     isActive: true,
                                     toolType: args.type === NodeType.TOOL ? 'function' : undefined
                                 };
                                 
                                 nextProject.nodes[newId] = newNode;
                                 nextStack.push(newId);
                                 addLog('ORCHESTRATOR', `Constructed ${newNode.type}: ${newNode.name}`, 'success');
                                 result = `Success. Node created with ID: ${newId}`;
                                 modified = true;
                             }
                             else if (args.action === 'update') {
                                 const nodeId = args.nodeId;
                                 if (!nextProject.nodes[nodeId]) throw new Error(`Node ${nodeId} not found`);
                                 
                                 const node = nextProject.nodes[nodeId];
                                 nextProject.nodes[nodeId] = {
                                     ...node,
                                     name: args.name || node.name,
                                     systemInstruction: args.content !== undefined ? args.content : node.systemInstruction,
                                     memoryContent: args.content !== undefined ? args.content : node.memoryContent,
                                     code: args.code || node.code,
                                     parentId: args.parentId || node.parentId,
                                     toolType: args.toolType || node.toolType
                                 };
                                 addLog('ORCHESTRATOR', `Updated configuration for ${node.name}`, 'info');
                                 result = `Success. Node ${nodeId} updated.`;
                                 modified = true;
                             }
                             else if (args.action === 'delete') {
                                 const nodeId = args.nodeId;
                                 if (!nextProject.nodes[nodeId]) throw new Error(`Node ${nodeId} not found`);
                                 delete nextProject.nodes[nodeId];
                                 nextStack = nextStack.filter(id => id !== nodeId);
                                 addLog('ORCHESTRATOR', `Deconstructed node ${nodeId}`, 'info');
                                 result = `Success. Node ${nodeId} deleted.`;
                                 modified = true;
                             }
                         } catch (e: any) {
                             result = `Error: ${e.message}`;
                             addLog('ORCHESTRATOR', `Operation failed: ${e.message}`, 'error');
                         }
                     } 
                     // --- RUNTIME EXECUTOR ---
                     else {
                         const toolName = call.name;
                         const targetNode = Object.values(nextProject.nodes).find(n => n.name.replace(/[^a-zA-Z0-9_]/g, '_') === toolName);
                         
                         if (targetNode) {
                             addLog('RUNTIME', `Executing ${toolName}...`, 'info');
                             
                             try {
                                 // --- ELECTRON BRIDGE CHECK ---
                                 if (targetNode.language === 'python') {
                                     if (window.electron) {
                                         const res = await window.electron.runScript('python', targetNode.code || '');
                                         result = res;
                                         addLog('STDOUT', res, 'success');
                                     } else {
                                         throw new Error("Python execution requires Desktop Runtime (Electron).");
                                     }
                                 } else {
                                     // Standard JS Browser Execution
                                     const print = (msg: any) => addLog(toolName.toUpperCase(), typeof msg === 'object' ? JSON.stringify(msg) : String(msg), 'info');
                                     const func = new AsyncFunction('args', 'print', targetNode.code || 'return "No code defined";');
                                     const executionResult = await func(call.args, print);
                                     result = typeof executionResult === 'object' ? JSON.stringify(executionResult) : String(executionResult);
                                     addLog('RUNTIME', `[${toolName}] Exit Code 0. Result: ${result.substring(0, 50)}...`, 'success');
                                 }

                             } catch (e: any) {
                                 result = `Runtime Exception: ${e.message}`;
                                 addLog('RUNTIME', `[${toolName}] CRASHED: ${e.message}`, 'error');
                             }

                         } else {
                             result = `[System] Error: Tool definition '${toolName}' not found in active registry.`;
                             addLog('RUNTIME', `Failed to execute ${toolName}: Not found`, 'error');
                         }
                     }
                     
                     const toolResponseMsg = { id: Date.now().toString(), role: Role.TOOL, content: "done", toolResponse: { name: call.name, content: result }, timestamp: Date.now() };
                     newHistory.push(toolResponseMsg);
                     updateSessionMessages(targetSessionId, prev => [...prev, toolResponseMsg]);
                }

                if (modified && !triggeredSimulationChange) {
                    setActiveProject(nextProject);
                    setActiveContextIds(nextStack);
                }

                // Continue conversation with updated context
                // IMPORTANT: If simulation changed, 'nextProject' is correctly set to the new state (either the clone or the revert)
                await processChatTurn(targetSessionId, newHistory, null, undefined, nextStack, nextProject);
            },
            () => setIsLoading(false),
            (error) => { setIsLoading(false); updateSessionMessages(targetSessionId, prev => prev.map(m => m.id === aiMsgId ? { ...m, content: `Error: ${error.message}`, thinking: false } : m)); }
        );
    };

    const handleSend = async (input: string, image?: string, focusMode?: boolean) => {
        if ((!input.trim() && !image) || isLoading) return;
        
        const currentMessages = activeSession?.messages || [];
        if (currentMessages.length === 0) {
            const newTitle = input.substring(0, 30) + (input.length > 30 ? '...' : '');
            handleRenameSession(activeSessionId, newTitle);
        }

        const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content: input + (image ? '\n(Image attached)' : ''), timestamp: Date.now() };
        updateSessionMessages(activeSessionId, prev => [...prev, userMsg]);
        
        setIsLoading(true);
        const overlayFilter = focusMode ? [activeProject.selectedNodeId] : undefined;
        await processChatTurn(activeSessionId, [...currentMessages, userMsg], input, image, overlayFilter);
    };

    const handleRunCode = async () => {
        const node = activeProject.nodes[activeProject.selectedNodeId] as AetherNode;
        if(!node) return;
        setIsTerminalCollapsed(false);
        setTerminalTab('output');
        
        if (node.type === NodeType.TOOL) {
             addLog('MANUAL_EXEC', `Running ${node.name}...`, 'info');
             try {
                 if (node.language === 'python') {
                    if (window.electron) {
                        addLog('SHELL', 'Spawning Python Process...', 'info');
                        const res = await window.electron.runScript('python', node.code || '');
                        addLog('STDOUT', res, 'success');
                    } else {
                        addLog('STDERR', 'Python runtime unavailable in browser mode.', 'error');
                    }
                 } else {
                    const print = (msg: any) => addLog(node.name.toUpperCase(), String(msg), 'info');
                    const func = new AsyncFunction('args', 'print', node.code || '');
                    await func({}, print);
                    addLog('RUNTIME', 'Execution complete.', 'success');
                 }
             } catch (e: any) {
                 addLog('STDERR', e.message, 'error');
             }
        } else {
            addLog('KERNEL', `Exec not supported for ${node.type}.`, 'info');
        }
    };

    const toggleContextId = (id: string) => {
        setActiveContextIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div ref={appContainerRef} className="flex w-full h-screen bg-studio-bg text-studio-text font-sans overflow-hidden">
            
            {/* Dashboard Overlay */}
            {isDashboardOpen && (
                <ProjectDashboard 
                    projects={projectList}
                    activeProjectId={activeProjectId}
                    onOpenProject={setActiveProjectId}
                    onCreateProject={handleCreateProject}
                    onDeleteProject={handleDeleteProject}
                    onClose={() => setIsDashboardOpen(false)}
                />
            )}

            {/* Activity Bar */}
            <div className="w-12 bg-[#09090b] border-r border-studio-border flex flex-col items-center py-4 gap-4 z-30 flex-shrink-0 select-none draggable-region">
                <button 
                    onClick={() => setIsDashboardOpen(true)}
                    className={`p-2 rounded text-white mb-2 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-colors ${isSimulating ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-blue-600'}`}
                    title="Workspace Dashboard"
                >
                    {isSimulating ? <Icons.Zap size={18} /> : <Icons.Grid size={18} />}
                </button>
                
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded transition-all ${isSidebarOpen ? 'text-white bg-white/10 border-l-2 border-blue-500' : 'text-studio-dim hover:text-white'}`} title="Project Explorer"><Icons.Folder size={18} /></button>
                <button className={`p-2 rounded transition-all ${activeView === 'graph' ? 'text-white bg-white/10 border-l-2 border-blue-500' : 'text-studio-dim hover:text-white'}`} onClick={() => setActiveView('graph')} title="Blueprint Graph"><Icons.Split size={18} /></button>
                <button className={`p-2 rounded transition-all ${activeView === 'code' ? 'text-white bg-white/10 border-l-2 border-blue-500' : 'text-studio-dim hover:text-white'}`} onClick={() => setActiveView('code')} title="Logic Editor"><Icons.Terminal size={18} /></button>
                <button className={`p-2 rounded transition-all ${activeView === 'chat' ? 'text-white bg-white/10 border-l-2 border-blue-500' : 'text-studio-dim hover:text-white'}`} onClick={() => setActiveView('chat')} title="Command Center"><Icons.MessageSquare size={18} /></button>
                
                <div className="mt-auto mb-2 flex flex-col items-center gap-4">
                     {window.electron && (
                         <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" title="Desktop Runtime Active"></div>
                     )}
                     <button onClick={() => setIsChatOverlayOpen(!isChatOverlayOpen)} className={`p-2 rounded transition-all ${isChatOverlayOpen ? 'text-blue-400 bg-blue-500/10' : 'text-studio-dim hover:text-white'}`} title="Quick Link"><Icons.ExternalLink size={18} /></button>
                </div>
            </div>

            {/* Collapsible Sidebar */}
            {isSidebarOpen && activeView !== 'chat' && (
                <>
                    <div style={{ width: leftWidth }} className="flex-shrink-0 h-full flex flex-col border-r border-studio-border bg-[#09090b]">
                        <Sidebar 
                            project={activeProject} 
                            setProject={setActiveProject} 
                            isVisible={isSidebarOpen} 
                            onOpenKernel={() => handleNodeOpen('root')}
                            onOpenTerminal={() => { setIsTerminalCollapsed(false); setTerminalTab('output'); }}
                            onExportContext={generateFullSystemContext}
                        />
                    </div>
                    <Resizer direction="horizontal" onMouseDown={startResizing('left')} />
                </>
            )}

            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] h-full relative">
                
                {/* Simulation Header Banner */}
                {isSimulating && (
                    <div className="h-8 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between px-4 text-xs font-bold uppercase tracking-widest text-amber-500 select-none animate-in slide-in-from-top">
                        <div className="flex items-center gap-2">
                            <Icons.Zap size={14} />
                            <span>Simulation Runtime Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={abortSimulation} className="px-2 py-0.5 rounded hover:bg-amber-500/20">Abort</button>
                            <button onClick={commitSimulation} className="px-3 py-0.5 rounded bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20">Commit to Live</button>
                        </div>
                    </div>
                )}

                {/* Workspace View */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <ErrorBoundary onReset={abortSimulation}>
                        {activeView === 'graph' && <CanvasView project={activeProject} onSelectNode={handleNodeSelect} onOpenCode={handleNodeOpen} setProject={setActiveProject} onCreateNode={createNode} />}
                        {activeView === 'code' && (
                            <div className="h-full">
                                {activeProject.nodes[activeProject.selectedNodeId] ? 
                                    <CodeEditor node={activeProject.nodes[activeProject.selectedNodeId]} project={activeProject} setProject={setActiveProject} onRun={handleRunCode} /> : 
                                    <div className="flex flex-col items-center justify-center h-full text-studio-dim text-xs gap-3"><Icons.Terminal size={32} className="opacity-20"/><span>Select a node to edit logic</span></div>}
                            </div>
                        )}
                        {activeView === 'chat' && (
                            <ChatView 
                                sessions={sessions}
                                activeSessionId={activeSessionId}
                                onSwitchSession={setActiveSessionId}
                                onNewSession={handleNewSession}
                                onDeleteSession={handleDeleteSession}
                                onRenameSession={handleRenameSession}
                                messages={messages} 
                                onSendMessage={handleSend} 
                                isLoading={isLoading} 
                                project={activeProject}
                                activeContextIds={activeContextIds}
                                onToggleContext={toggleContextId}
                            />
                        )}
                    </ErrorBoundary>

                    {/* Global Chat Overlay */}
                    <ChatOverlay 
                        isOpen={isChatOverlayOpen} 
                        onClose={() => setIsChatOverlayOpen(false)}
                        messages={messages}
                        onSendMessage={handleSend}
                        isLoading={isLoading}
                        project={activeProject}
                    />
                </div>

                {/* Bottom Dock */}
                <Resizer direction="vertical" onMouseDown={startResizing('bottom')} />
                <TerminalPanel 
                    messages={messages} 
                    isCollapsed={isTerminalCollapsed} 
                    onToggleCollapse={() => setIsTerminalCollapsed(!isTerminalCollapsed)} 
                    activeTab={terminalTab} 
                    onSwitchTab={setTerminalTab} 
                    onClose={() => setIsTerminalCollapsed(true)} 
                    style={{ height: isTerminalCollapsed ? 32 : bottomHeight }} 
                />
            </div>
        </div>
    );
};

export default App;
