
import React, { useState } from 'react';
import { ProjectMetadata } from '../types';
import Icons from './Icon';

interface ProjectDashboardProps {
    projects: ProjectMetadata[];
    activeProjectId: string;
    onOpenProject: (id: string) => void;
    onCreateProject: (name: string, description: string, type: 'agent' | 'code' | 'data' | 'creative') => void;
    onDeleteProject: (id: string) => void;
    onClose: () => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
    projects, activeProjectId, onOpenProject, onCreateProject, onDeleteProject, onClose 
}) => {
    const [view, setView] = useState<'grid' | 'create'>('grid');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectType, setNewProjectType] = useState<'agent' | 'code' | 'data' | 'creative'>('agent');

    const handleCreate = () => {
        if (!newProjectName.trim()) return;
        onCreateProject(newProjectName, newProjectDesc, newProjectType);
        setNewProjectName('');
        setNewProjectDesc('');
        setView('grid');
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'agent': return 'bg-blue-500';
            case 'code': return 'bg-yellow-500';
            case 'data': return 'bg-purple-500';
            case 'creative': return 'bg-pink-500';
            default: return 'bg-gray-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'agent': return <Icons.NodeAgent size={24} className="text-white"/>;
            case 'code': return <Icons.Terminal size={24} className="text-white"/>;
            case 'data': return <Icons.Cpu size={24} className="text-white"/>;
            case 'creative': return <Icons.Zap size={24} className="text-white"/>;
            default: return <Icons.Zap size={24} className="text-white"/>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/90 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[80vh] bg-[#121214] border border-studio-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="h-16 border-b border-studio-border flex items-center justify-between px-8 bg-[#161b22] select-none">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                            <Icons.Grid size={18} className="text-white"/>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Workspace Manager</h2>
                            <p className="text-[10px] text-studio-dim">Launchpad v3.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-studio-dim hover:text-white transition-colors">
                        <Icons.Close size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#0d1117]">
                    {view === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Create New Card */}
                            <div 
                                onClick={() => setView('create')}
                                className="group relative aspect-video rounded-xl border border-dashed border-studio-border/50 hover:border-blue-500/50 bg-white/5 hover:bg-blue-500/5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-blue-500/20 flex items-center justify-center mb-3 transition-colors">
                                    <Icons.Plus size={24} className="text-studio-dim group-hover:text-blue-400"/>
                                </div>
                                <span className="text-xs font-bold text-studio-text group-hover:text-blue-400 uppercase tracking-wider">Create New Project</span>
                            </div>

                            {/* Project Cards */}
                            {projects.map(proj => (
                                <div 
                                    key={proj.id}
                                    className={`
                                        group relative aspect-video rounded-xl border border-studio-border bg-[#161b22] hover:border-studio-dim/50 transition-all duration-300 flex flex-col overflow-hidden shadow-lg
                                        ${activeProjectId === proj.id ? 'ring-2 ring-blue-500 border-transparent' : ''}
                                    `}
                                >
                                    {/* Card Header / Banner */}
                                    <div className={`h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent ${getTypeColor(proj.thumbnail || 'agent')} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                                    
                                    <div className="flex-1 p-5 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-10 h-10 rounded-lg ${getTypeColor(proj.thumbnail || 'agent')} shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center justify-center`}>
                                                {getTypeIcon(proj.thumbnail || 'agent')}
                                            </div>
                                            {activeProjectId === proj.id && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase tracking-wide border border-blue-500/30">
                                                    Active
                                                </span>
                                            )}
                                            {activeProjectId !== proj.id && (
                                                 <div className="relative group/menu">
                                                    <button className="p-1 rounded hover:bg-white/10 text-studio-dim"><Icons.MoreHorizontal size={16} /></button>
                                                    <div className="absolute right-0 top-full mt-1 w-24 bg-[#1c2128] border border-studio-border rounded shadow-xl hidden group-hover/menu:block z-20">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onDeleteProject(proj.id); }}
                                                            className="w-full text-left px-3 py-2 text-[10px] text-red-400 hover:bg-white/5"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                 </div>
                                            )}
                                        </div>

                                        <h3 className="text-sm font-bold text-white mb-1 truncate">{proj.name}</h3>
                                        <p className="text-[10px] text-studio-dim line-clamp-2 flex-1">{proj.description || 'No description provided.'}</p>
                                        
                                        <div className="mt-4 flex items-center justify-between text-[9px] text-studio-dim/50 font-mono">
                                            <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                                            <span>{proj.id.substring(0, 6)}</span>
                                        </div>
                                    </div>

                                    {/* Action Overlay */}
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => onOpenProject(proj.id)}
                                            className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-gray-200 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                        >
                                            OPEN STUDIO
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create View */}
                    {view === 'create' && (
                        <div className="flex flex-col items-center justify-center h-full animate-in slide-in-from-bottom-4 duration-300">
                            <div className="w-full max-w-md space-y-6">
                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-bold text-white mb-2">Initialize New Workspace</h3>
                                    <p className="text-xs text-studio-dim">Define the scope and type of your new Aether project.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-studio-dim">Project Name</label>
                                    <input 
                                        type="text" 
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        className="w-full bg-[#161b22] border border-studio-border rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-studio-dim/30"
                                        placeholder="e.g. Neural Network Optimizer"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-studio-dim">Description</label>
                                    <textarea 
                                        rows={3}
                                        value={newProjectDesc}
                                        onChange={(e) => setNewProjectDesc(e.target.value)}
                                        className="w-full bg-[#161b22] border border-studio-border rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-studio-dim/30 resize-none"
                                        placeholder="What is the goal of this system?"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-studio-dim">Archetype</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['agent', 'code', 'data', 'creative'] as const).map(type => (
                                            <div 
                                                key={type}
                                                onClick={() => setNewProjectType(type)}
                                                className={`
                                                    p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all
                                                    ${newProjectType === type ? 'bg-blue-500/10 border-blue-500' : 'bg-[#161b22] border-studio-border hover:border-studio-dim'}
                                                `}
                                            >
                                                <div className={`w-8 h-8 rounded flex items-center justify-center ${getTypeColor(type)} shadow-lg`}>
                                                    {getTypeIcon(type)}
                                                </div>
                                                <span className="text-xs font-medium text-white capitalize">{type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button 
                                        onClick={() => setView('grid')}
                                        className="flex-1 py-3 rounded-lg border border-studio-border text-studio-dim hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCreate}
                                        disabled={!newProjectName.trim()}
                                        className={`flex-1 py-3 rounded-lg text-white text-xs font-bold uppercase transition-all shadow-lg ${newProjectName.trim() ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-studio-border opacity-50 cursor-not-allowed'}`}
                                    >
                                        Launch Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;
