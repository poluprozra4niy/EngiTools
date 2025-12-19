import React, { useState, useMemo } from 'react';
import { Network, Plus, Trash2, AlertTriangle, CheckCircle, ArrowDown } from 'lucide-react';

interface Node {
    id: number;
    type: 'Master' | 'Slave' | 'Repeater';
    distanceToNext: number; // meters
    terminator: boolean;
    name: string;
}

const SPEED_LIMITS: Record<string, number> = {
    '9.6': 1200,
    '19.2': 1200,
    '93.75': 1200,
    '187.5': 1000,
    '500': 400,
    '1500': 200,
    '3000': 100,
    '6000': 100,
    '12000': 100
};

export const ProfibusTopology: React.FC = () => {
    const [speed, setSpeed] = useState<string>('1500');
    const [nodes, setNodes] = useState<Node[]>([
        { id: 1, type: 'Master', distanceToNext: 10, terminator: true, name: 'PLC' },
        { id: 2, type: 'Slave', distanceToNext: 50, terminator: false, name: 'ET200S' },
        { id: 3, type: 'Slave', distanceToNext: 0, terminator: true, name: 'Drive' }
    ]);

    const maxLen = SPEED_LIMITS[speed];

    // Calculations
    const totalLength = useMemo(() => nodes.reduce((acc, node) => acc + node.distanceToNext, 0), [nodes]);
    const deviceCount = nodes.length;
    
    // Validations
    const isLengthValid = totalLength <= maxLen;
    const isCountValid = deviceCount <= 32;
    const isTerminatorStart = nodes[0]?.terminator;
    const isTerminatorEnd = nodes[nodes.length - 1]?.terminator;
    const excessTerminators = nodes.slice(1, nodes.length - 1).filter(n => n.terminator).length > 0;

    const addNode = () => {
        setNodes(prev => {
            const last = prev[prev.length - 1];
            // Update previous last node to have distance
            const updatedPrev = prev.slice(0, -1);
            return [
                ...updatedPrev,
                { ...last, distanceToNext: 10, terminator: false }, // Old last node
                { id: Date.now(), type: 'Slave', distanceToNext: 0, terminator: true, name: `Slave ${prev.length}` } // New last node
            ];
        });
    };

    const removeNode = (id: number) => {
        if (nodes.length <= 2) return;
        setNodes(prev => prev.filter(n => n.id !== id));
    };

    const updateNode = (id: number, field: keyof Node, value: any) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto pb-12">
            <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                    <Network className="text-purple-500" size={40} />
                    Topology Checker
                </h1>
                <p className="text-gray-400">
                    Визуальное построение сегмента сети. Проверка длины, терминаторов и количества устройств.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left: Controls & Stats */}
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-xl">
                        <h3 className="text-white font-bold mb-4">Настройки Сегмента</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Скорость (kbit/s)</label>
                                <select 
                                    value={speed} 
                                    onChange={e => setSpeed(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white"
                                >
                                    {Object.keys(SPEED_LIMITS).map(k => (
                                        <option key={k} value={k}>{Number(k) >= 1000 ? `${Number(k)/1000} Mbit/s` : `${k} kbit/s`}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Лимит длины:</span>
                                    <span className="font-mono text-white">{maxLen} м</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Текущая длина:</span>
                                    <span className={`font-mono font-bold ${isLengthValid ? 'text-green-400' : 'text-red-400'}`}>
                                        {totalLength} м
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${isLengthValid ? 'bg-green-500' : 'bg-red-500'}`} 
                                        style={{ width: `${Math.min(100, (totalLength / maxLen) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-xl">
                        <h3 className="text-white font-bold mb-4">Валидация</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-2">
                                {isLengthValid ? <CheckCircle className="text-green-500" size={16}/> : <AlertTriangle className="text-red-500" size={16}/>}
                                <span className={isLengthValid ? 'text-gray-300' : 'text-red-300'}>Длина сегмента ОК</span>
                            </li>
                            <li className="flex items-center gap-2">
                                {isCountValid ? <CheckCircle className="text-green-500" size={16}/> : <AlertTriangle className="text-red-500" size={16}/>}
                                <span className={isCountValid ? 'text-gray-300' : 'text-red-300'}>Кол-во устройств ({deviceCount}/32)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                {(isTerminatorStart && isTerminatorEnd && !excessTerminators) 
                                    ? <CheckCircle className="text-green-500" size={16}/> 
                                    : <AlertTriangle className="text-amber-500" size={16}/>}
                                <span className={(isTerminatorStart && isTerminatorEnd && !excessTerminators) ? 'text-gray-300' : 'text-amber-300'}>
                                    Терминаторы (ON на концах)
                                </span>
                            </li>
                        </ul>
                        {!isTerminatorStart && <p className="text-xs text-amber-500 mt-2 ml-6">Включите терминатор на первом устройстве.</p>}
                        {!isTerminatorEnd && <p className="text-xs text-amber-500 mt-1 ml-6">Включите терминатор на последнем устройстве.</p>}
                        {excessTerminators && <p className="text-xs text-red-400 mt-1 ml-6">Выключите лишние терминаторы в середине!</p>}
                    </div>
                </div>

                {/* Right: Visual Builder */}
                <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col items-center min-h-[500px]">
                    <div className="space-y-0 w-full max-w-md">
                        {nodes.map((node, index) => (
                            <div key={node.id} className="relative flex flex-col items-center animate-fade-in">
                                {/* Connector Line */}
                                {index > 0 && (
                                    <div className="h-16 w-1 bg-purple-900 relative flex items-center justify-center">
                                         {/* Distance Input on Line */}
                                         <div className="absolute bg-gray-900 border border-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 z-10 hover:border-purple-500 transition-colors">
                                            <input 
                                                type="number"
                                                value={nodes[index-1].distanceToNext}
                                                onChange={(e) => updateNode(nodes[index-1].id, 'distanceToNext', parseInt(e.target.value) || 0)}
                                                className="w-12 bg-transparent text-center outline-none text-white font-mono"
                                            />
                                            <span className="text-gray-500">m</span>
                                         </div>
                                    </div>
                                )}

                                {/* Node Card */}
                                <div className={`relative w-full bg-gray-800 border-2 p-4 rounded-xl flex justify-between items-center group transition-colors ${
                                    node.terminator ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-gray-700'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                            node.type === 'Master' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <input 
                                                value={node.name}
                                                onChange={(e) => updateNode(node.id, 'name', e.target.value)}
                                                className="bg-transparent text-white font-bold outline-none w-32 focus:border-b border-purple-500"
                                            />
                                            <div className="text-xs text-gray-500 uppercase">{node.type}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <label className="flex flex-col items-center cursor-pointer">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Term</span>
                                            <div 
                                                onClick={() => updateNode(node.id, 'terminator', !node.terminator)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${node.terminator ? 'bg-purple-600' : 'bg-gray-600'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${node.terminator ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>

                                        {nodes.length > 2 && (
                                            <button 
                                                onClick={() => removeNode(node.id)}
                                                className="text-gray-600 hover:text-red-500 p-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Type Selector (Hover) */}
                                    <div className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-700 rounded p-1 flex flex-col gap-1">
                                         {['Master', 'Slave', 'Repeater'].map(t => (
                                             <button 
                                                key={t}
                                                onClick={() => updateNode(node.id, 'type', t)}
                                                className={`text-[10px] px-2 py-1 rounded ${node.type === t ? 'bg-purple-600' : 'hover:bg-gray-800'}`}
                                             >
                                                 {t}
                                             </button>
                                         ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="h-10 w-1 bg-purple-900/30 mx-auto"></div>
                        
                        <div className="flex justify-center">
                            <button 
                                onClick={addNode}
                                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded-full p-3 transition-transform hover:scale-110"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};