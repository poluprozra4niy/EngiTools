import React, { useState, useEffect, useRef } from 'react';
import { 
    Monitor, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
    CornerDownLeft, XCircle, RotateCcw, Power, Zap, Activity
} from 'lucide-react';

// --- Types ---
type RelayState = 'NORMAL' | 'PICKUP' | 'TRIP' | 'ALARM';

interface MenuItem {
    id: string;
    label: string;
    type: 'FOLDER' | 'PARAM' | 'READONLY' | 'ACTION';
    value?: string | number;
    unit?: string;
    children?: MenuItem[];
    action?: () => void;
}

// --- Menu Structure ---
const createMenu = (
    currents: { Ia: number, Ib: number, Ic: number }, 
    settings: { pickup: number, delay: number },
    onReset: () => void,
    onChangeSetting: (key: 'pickup'|'delay', val: number) => void
): MenuItem[] => [
    {
        id: 'meas', label: 'Измерения', type: 'FOLDER', children: [
            { id: 'ia', label: 'Ia (L1)', type: 'READONLY', value: currents.Ia.toFixed(1), unit: 'A' },
            { id: 'ib', label: 'Ib (L2)', type: 'READONLY', value: currents.Ib.toFixed(1), unit: 'A' },
            { id: 'ic', label: 'Ic (L3)', type: 'READONLY', value: currents.Ic.toFixed(1), unit: 'A' },
        ]
    },
    {
        id: 'set', label: 'Уставки', type: 'FOLDER', children: [
            { id: 'mtz', label: 'МТЗ (50/51)', type: 'FOLDER', children: [
                { id: 'iset', label: 'I сраб (Is)', type: 'PARAM', value: settings.pickup, unit: 'A' },
                { id: 'tset', label: 'T сраб (Ts)', type: 'PARAM', value: settings.delay, unit: 's' }
            ]}
        ]
    },
    {
        id: 'ctrl', label: 'Управление', type: 'FOLDER', children: [
            { id: 'rst', label: 'Сброс (Reset)', type: 'ACTION', action: onReset }
        ]
    }
];

export const RzaVirtualRelay: React.FC = () => {
    // --- State ---
    
    // Relay Logic State
    const [currents, setCurrents] = useState({ Ia: 0, Ib: 0, Ic: 0 });
    const [settings, setSettings] = useState({ pickup: 5.0, delay: 2.0 }); // Default 5A, 2s
    const [relayState, setRelayState] = useState<RelayState>('NORMAL');
    const [tripReason, setTripReason] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);

    // HMI State
    const [menuPath, setMenuPath] = useState<MenuItem[]>([]); // Empty = Root
    const [cursor, setCursor] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [editValue, setEditValue] = useState(0); // Temp value during edit

    // --- Simulation Loop ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (relayState === 'TRIP') return; // Latch trip

            const maxI = Math.max(currents.Ia, currents.Ib, currents.Ic);
            
            if (maxI > settings.pickup) {
                setRelayState('PICKUP');
                setTimer(t => t + 0.1); // Add 100ms
                
                if (timer >= settings.delay) {
                    setRelayState('TRIP');
                    setTripReason(`МТЗ I>${maxI.toFixed(1)}A`);
                }
            } else {
                if (relayState === 'PICKUP') {
                    // Reset if current drops below pickup (instant reset logic for simplicity)
                    setRelayState('NORMAL');
                    setTimer(0);
                }
            }
        }, 100); // 10Hz simulation

        return () => clearInterval(interval);
    }, [currents, settings, relayState, timer]);

    // --- Menu Helpers ---
    
    // Helper to change settings (passed to menu creator)
    const changeSetting = (key: 'pickup'|'delay', val: number) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    // Helper reset (passed to menu)
    const resetRelay = () => {
        setRelayState('NORMAL');
        setTimer(0);
        setTripReason(null);
    };

    // Re-generate menu on every render to reflect live values
    const rootMenu = createMenu(currents, settings, resetRelay, changeSetting);

    // Get current menu level
    const currentLevel = menuPath.length === 0 ? rootMenu : menuPath[menuPath.length - 1].children || [];

    // --- HMI Handlers ---

    const handleUp = () => {
        if (editMode) {
            setEditValue(v => Math.round((v + 0.1) * 10) / 10);
        } else {
            setCursor(prev => (prev > 0 ? prev - 1 : currentLevel.length - 1));
        }
    };

    const handleDown = () => {
        if (editMode) {
            setEditValue(v => Math.max(0, Math.round((v - 0.1) * 10) / 10));
        } else {
            setCursor(prev => (prev < currentLevel.length - 1 ? prev + 1 : 0));
        }
    };

    const handleEnter = () => {
        if (relayState === 'TRIP') {
            resetRelay();
            return;
        }

        const item = currentLevel[cursor];
        
        if (editMode) {
            // Save Value
            if (item.id === 'iset') changeSetting('pickup', editValue);
            if (item.id === 'tset') changeSetting('delay', editValue);
            setEditMode(false);
            return;
        }

        if (item.type === 'FOLDER' && item.children) {
            setMenuPath(prev => [...prev, item]);
            setCursor(0);
        } else if (item.type === 'ACTION' && item.action) {
            item.action();
        } else if (item.type === 'PARAM') {
            setEditMode(true);
            setEditValue(Number(item.value));
        }
    };

    const handleEsc = () => {
        if (relayState === 'TRIP') {
            resetRelay();
            return;
        }
        
        if (editMode) {
            setEditMode(false);
        } else if (menuPath.length > 0) {
            setMenuPath(prev => prev.slice(0, -1));
            setCursor(0);
        }
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto pb-12 flex flex-col md:flex-row gap-8 items-start justify-center h-[calc(100vh-140px)] min-h-[600px]">
            
            {/* --- DEVICE FACEPLATE --- */}
            <div className="relative bg-[#1a1a1a] p-6 rounded-xl border-4 border-gray-600 shadow-2xl w-[400px] shrink-0 h-[600px] flex flex-col">
                
                {/* Branding */}
                <div className="flex justify-between items-center mb-6">
                    <div className="font-bold text-gray-400 uppercase tracking-widest text-xs">Protec 500</div>
                    <div className="text-[10px] text-gray-600 font-mono">SERIES X</div>
                </div>

                {/* LCD Display */}
                <div className="bg-[#2a3028] border-4 border-gray-700 rounded-lg p-4 h-48 mb-8 relative font-mono shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* LCD Backlight / Scanlines */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,6px_100%]"></div>
                    
                    {/* LCD Content */}
                    <div className="relative z-10 text-[#a8e6cf] text-sm leading-6">
                        {relayState === 'TRIP' ? (
                            <div className="text-center mt-8 animate-pulse">
                                <div className="text-red-400 font-bold text-lg">*** TRIP ***</div>
                                <div>{tripReason}</div>
                                <div className="mt-4 text-xs">Press RESET key</div>
                            </div>
                        ) : editMode ? (
                            <div className="text-center mt-8">
                                <div className="uppercase mb-2">{currentLevel[cursor].label}</div>
                                <div className="text-2xl font-bold bg-[#a8e6cf] text-black inline-block px-2">
                                    {editValue.toFixed(1)} {currentLevel[cursor].unit}
                                </div>
                            </div>
                        ) : (
                            // Menu Render
                            <div>
                                <div className="border-b border-[#a8e6cf]/30 mb-1 pb-1 text-xs uppercase flex justify-between">
                                    <span>{menuPath.length > 0 ? menuPath[menuPath.length-1].label : 'Main Menu'}</span>
                                    {relayState === 'PICKUP' && <span className="bg-red-500 text-black px-1 animate-pulse">START</span>}
                                </div>
                                {currentLevel.map((item, i) => (
                                    <div key={item.id} className={`flex justify-between px-1 ${i === cursor ? 'bg-[#a8e6cf] text-black font-bold' : ''}`}>
                                        <span>{item.label}</span>
                                        {item.value !== undefined && <span>{item.value} {item.unit}</span>}
                                        {item.type === 'FOLDER' && <span>&gt;</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Area */}
                <div className="flex-1 flex gap-6">
                    
                    {/* LEDs */}
                    <div className="flex flex-col gap-4 items-center justify-center border-r border-gray-700 pr-6">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${relayState === 'NORMAL' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-green-900'}`}></div>
                            <span className="text-[8px] text-gray-400 uppercase">On</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${relayState === 'PICKUP' || relayState === 'TRIP' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-yellow-900'}`}></div>
                            <span className="text-[8px] text-gray-400 uppercase">Start</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${relayState === 'TRIP' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-red-900'}`}></div>
                            <span className="text-[8px] text-gray-400 uppercase">Trip</span>
                        </div>

                        {/* Reset Button */}
                        <button 
                            onClick={resetRelay}
                            className="mt-4 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-[9px] font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors active:translate-y-0.5 shadow-md"
                            title="Reset Latch"
                        >
                            RESET
                        </button>
                    </div>

                    {/* Keypad */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="flex items-end justify-center gap-2">
                            <button onClick={handleUp} className="w-10 h-10 bg-gray-700 rounded shadow-lg active:translate-y-0.5 active:shadow-none flex items-center justify-center hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0">
                                <ArrowUp size={20} className="text-white"/>
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={handleEsc} className="w-10 h-10 bg-gray-700 rounded shadow-lg active:translate-y-0.5 active:shadow-none flex items-center justify-center hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0" title="Cancel / Reset">
                                <XCircle size={20} className="text-red-400"/>
                            </button>
                            <button onClick={handleEnter} className="w-14 h-14 bg-gray-700 rounded-full shadow-lg active:translate-y-0.5 active:shadow-none flex items-center justify-center hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0" title="Enter / Ack">
                                <CornerDownLeft size={24} className="text-green-400"/>
                            </button>
                            <button className="w-10 h-10 bg-gray-700 rounded shadow-lg active:translate-y-0.5 active:shadow-none flex items-center justify-center hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0 opacity-50 cursor-not-allowed">
                                <ArrowRight size={20} className="text-white"/>
                            </button>
                        </div>
                        <div className="flex items-start justify-center gap-2">
                            <button onClick={handleDown} className="w-10 h-10 bg-gray-700 rounded shadow-lg active:translate-y-0.5 active:shadow-none flex items-center justify-center hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0">
                                <ArrowDown size={20} className="text-white"/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Screw Terminals Mockup */}
                <div className="mt-6 border-t border-gray-700 pt-4 flex justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500 border border-black shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 border border-black shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 border border-black shadow-inner"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-500 border border-black shadow-inner"></div>
                </div>
            </div>

            {/* --- INJECTION PANEL --- */}
            <div className="flex-1 max-w-md space-y-6">
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500"/> Инжектор Тока
                    </h3>
                    
                    <div className="space-y-6">
                        {['Ia', 'Ib', 'Ic'].map((phase) => (
                            <div key={phase}>
                                <div className="flex justify-between mb-2">
                                    <label className="font-bold text-gray-400">{phase} (A)</label>
                                    <span className="font-mono text-white text-lg font-bold">{(currents as any)[phase].toFixed(1)} A</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="20" step="0.1"
                                    value={(currents as any)[phase]}
                                    onChange={(e) => setCurrents(p => ({ ...p, [phase]: Number(e.target.value) }))}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={() => setCurrents({ Ia: 0, Ib: 0, Ic: 0 })}
                            className="text-sm text-gray-500 hover:text-white flex items-center gap-2"
                        >
                            <RotateCcw size={14}/> Сброс токов
                        </button>
                    </div>
                </div>

                {/* Legend / Info */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h4 className="text-gray-400 font-bold mb-3 flex items-center gap-2">
                        <Activity size={16}/> Статус Логики
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-gray-800 pb-1">
                            <span className="text-gray-500">Pickup Setting:</span>
                            <span className="text-amber-400">{settings.pickup} A</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-800 pb-1">
                            <span className="text-gray-500">Delay Setting:</span>
                            <span className="text-amber-400">{settings.delay} s</span>
                        </div>
                        <div className="flex justify-between pt-2">
                            <span className="text-gray-500">Internal Timer:</span>
                            <span className={`font-mono font-bold ${timer > 0 ? 'text-white' : 'text-gray-600'}`}>
                                {timer.toFixed(1)} s
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                    <b>Как пользоваться:</b>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                        <li>Используйте стрелки для навигации по меню реле.</li>
                        <li><b>Enter</b>: вход в папку или редактирование.</li>
                        <li><b>Esc</b>: назад или отмена.</li>
                        <li>При срабатывании (TRIP) нажмите <b>RESET</b> (или красную кнопку), чтобы сбросить аварию.</li>
                        <li>В меню <b>Уставки</b> измените ток срабатывания.</li>
                        <li>Ползунками справа подайте ток выше уставки и дождитесь срабатывания.</li>
                    </ul>
                </div>

            </div>

        </div>
    );
};