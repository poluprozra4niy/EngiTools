import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Binary, Upload, ZoomIn, ZoomOut, Play, Pause, Activity, MousePointer2 } from 'lucide-react';

// --- Types ---
interface Channel {
    name: string;
    unit: string;
    data: number[];
    color: string;
    type: 'Analog' | 'Digital';
}

interface ComtradeData {
    name: string;
    sampleRate: number; // Hz
    startTime: number; // usually 0
    duration: number; // seconds
    channels: Channel[];
}

// --- Demo Data Generator ---
const generateDemoFault = (): ComtradeData => {
    const fs = 1000; // 1kHz
    const duration = 0.5; // 500ms
    const samples = Math.floor(fs * duration);
    
    // Arrays
    const Ia: number[] = [], Ib: number[] = [], Ic: number[] = [];
    const Ua: number[] = [], Ub: number[] = [], Uc: number[] = [];
    const Trip: number[] = [], Pickup: number[] = [];

    const faultStart = 0.15; // 150ms
    const tripTime = 0.25; // 250ms

    for(let i=0; i<samples; i++) {
        const t = i / fs;
        let ia_amp = 5, ib_amp = 5, ic_amp = 5; // Normal load 5A
        let ua_amp = 100, ub_amp = 100, uc_amp = 100; // Normal Volt 100V

        // Fault: A-Phase short circuit
        if (t >= faultStart && t < tripTime) {
            ia_amp = 50; // Fault current 50A
            ua_amp = 40; // Voltage dip
        } else if (t >= tripTime) {
            // Breaker open
            ia_amp = 0; ib_amp = 0; ic_amp = 0;
        }

        const omega = 2 * Math.PI * 50; // 50Hz
        
        // Analog Generation with slight noise
        Ia.push(ia_amp * Math.sin(omega * t) + (Math.random()-0.5)*0.1);
        Ib.push(ib_amp * Math.sin(omega * t - 2*Math.PI/3) + (Math.random()-0.5)*0.1);
        Ic.push(ic_amp * Math.sin(omega * t + 2*Math.PI/3) + (Math.random()-0.5)*0.1);

        Ua.push(ua_amp * Math.sin(omega * t));
        Ub.push(ub_amp * Math.sin(omega * t - 2*Math.PI/3));
        Uc.push(uc_amp * Math.sin(omega * t + 2*Math.PI/3));

        // Digital Generation
        Pickup.push(t >= faultStart && t < tripTime ? 1 : 0);
        Trip.push(t >= tripTime && t < tripTime + 0.1 ? 1 : 0);
    }

    return {
        name: 'Demo_Fault_Line_A.cfg',
        sampleRate: fs,
        startTime: 0,
        duration,
        channels: [
            { name: 'IL1', unit: 'A', data: Ia, color: '#FBBF24', type: 'Analog' }, // Yellow
            { name: 'IL2', unit: 'A', data: Ib, color: '#10B981', type: 'Analog' }, // Green
            { name: 'IL3', unit: 'A', data: Ic, color: '#EF4444', type: 'Analog' }, // Red
            { name: 'UL1', unit: 'V', data: Ua, color: '#FDE68A', type: 'Analog' }, // Light Yellow
            { name: 'UL2', unit: 'V', data: Ub, color: '#6EE7B7', type: 'Analog' }, // Light Green
            { name: 'UL3', unit: 'V', data: Uc, color: '#FCA5A5', type: 'Analog' }, // Light Red
            { name: 'Start >', unit: '', data: Pickup, color: '#F59E0B', type: 'Digital' },
            { name: 'Trip >', unit: '', data: Trip, color: '#EF4444', type: 'Digital' },
        ]
    };
};

export const ComtradeAnalyzer: React.FC = () => {
    const [data, setData] = useState<ComtradeData | null>(null);
    const [cursor, setCursor] = useState<number>(0); // Sample Index
    const [zoom, setZoom] = useState<number>(1);
    
    // Canvas Refs
    const oscCanvasRef = useRef<HTMLCanvasElement>(null);
    const vectorCanvasRef = useRef<HTMLCanvasElement>(null);

    // --- Actions ---
    const loadDemo = () => {
        const demo = generateDemoFault();
        setData(demo);
        setCursor(Math.floor(demo.channels[0].data.length / 2)); // Middle
    };

    // --- Oscilloscope Renderer ---
    useEffect(() => {
        if (!data || !oscCanvasRef.current) return;
        const ctx = oscCanvasRef.current.getContext('2d');
        if (!ctx) return;

        const w = oscCanvasRef.current.width;
        const h = oscCanvasRef.current.height;
        const analogH = h * 0.7; // 70% for analog
        const digitalH = h * 0.3; // 30% for digital
        
        // Clear
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0b0f19'; 
        ctx.fillRect(0, 0, w, h);

        const totalSamples = data.channels[0].data.length;
        const viewSamples = totalSamples / zoom; // How many samples visible
        const startSample = Math.max(0, cursor - viewSamples / 2);
        const endSample = Math.min(totalSamples, cursor + viewSamples / 2);
        
        // Grid
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Verticals (Time)
        for (let i = 0; i < 10; i++) {
            const x = (i / 10) * w;
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        // Horizontals
        ctx.moveTo(0, analogH / 2); ctx.lineTo(w, analogH / 2); // Zero line
        ctx.stroke();

        // Draw Analog
        const maxVal = 120; // Fixed scale for demo simplicity (auto-scaling omitted for brevity)
        const scaleY = (analogH / 2) / maxVal;
        const midY = analogH / 2;

        data.channels.filter(c => c.type === 'Analog').forEach(ch => {
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < w; i++) {
                const sampleIdx = Math.floor(startSample + (i / w) * (endSample - startSample));
                if (sampleIdx >= totalSamples) break;
                
                const val = ch.data[sampleIdx];
                const y = midY - val * scaleY;
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            ctx.stroke();
        });

        // Draw Digital
        const digChannels = data.channels.filter(c => c.type === 'Digital');
        const rowH = digitalH / Math.max(1, digChannels.length);
        
        digChannels.forEach((ch, idx) => {
            const baseY = analogH + idx * rowH + rowH / 2;
            ctx.strokeStyle = ch.color;
            ctx.fillStyle = ch.color + '33'; // transparent fill
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            for (let i = 0; i < w; i++) {
                const sampleIdx = Math.floor(startSample + (i / w) * (endSample - startSample));
                if (sampleIdx >= totalSamples) break;
                
                const val = ch.data[sampleIdx];
                const y = baseY - (val * (rowH * 0.8)); // Signal high goes UP
                
                // Draw logic trace
                if (i === 0) ctx.moveTo(i, val ? y : baseY);
                else {
                    const prevIdx = Math.floor(startSample + ((i-1) / w) * (endSample - startSample));
                    const prevVal = ch.data[prevIdx];
                    if (prevVal !== val) ctx.lineTo(i, val ? y : baseY); // Vertical edge
                    ctx.lineTo(i, val ? y : baseY); // Horizontal
                }
            }
            ctx.stroke();
            // Label
            ctx.fillStyle = ch.color;
            ctx.font = '10px monospace';
            ctx.fillText(ch.name, 5, baseY - 5);
        });

        // Draw Cursor Line (Center)
        const cursorX = w / 2; // Cursor is always center in this zoom logic
        ctx.strokeStyle = '#FFF';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Time Label
        const timeAtCursor = cursor / data.sampleRate;
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.fillText(`T = ${timeAtCursor.toFixed(4)}s`, cursorX + 5, 15);

    }, [data, cursor, zoom]);

    // --- Vector Diagram Renderer ---
    const phasorData = useMemo(() => {
        if (!data) return { ia: {mag:0, ang:0}, ib: {mag:0, ang:0}, ic: {mag:0, ang:0}, ua: {mag:0, ang:0}, ub: {mag:0, ang:0}, uc: {mag:0, ang:0} };
        
        // Simple RMS & Phase estimation at cursor (1 cycle window back)
        const windowSize = Math.floor(data.sampleRate / 50); // 20ms window (50Hz)
        const start = Math.max(0, cursor - windowSize);
        const end = cursor;
        
        // Helper to calc phasor
        const calcPhasor = (samples: number[]) => {
            let sumSq = 0;
            // DFT for fundamental (50Hz)
            let re = 0, im = 0;
            for(let i=start; i<end; i++) {
                const t = i / data.sampleRate;
                const angle = 2 * Math.PI * 50 * t;
                re += samples[i] * Math.cos(angle);
                im += samples[i] * Math.sin(angle);
                sumSq += samples[i]**2;
            }
            // Scale DFT
            re = (2/windowSize) * re;
            im = (2/windowSize) * im;
            
            const mag = Math.sqrt(re**2 + im**2) / Math.sqrt(2); // RMS
            let ang = Math.atan2(im, re) * 180 / Math.PI; // Phase
            
            // Normalize angle relative to Ia (optional, or just absolute time)
            // Here we just keep absolute phase relative to T=0
            return { mag, ang };
        };

        return {
            ia: calcPhasor(data.channels.find(c=>c.name==='IL1')?.data || []),
            ib: calcPhasor(data.channels.find(c=>c.name==='IL2')?.data || []),
            ic: calcPhasor(data.channels.find(c=>c.name==='IL3')?.data || []),
            ua: calcPhasor(data.channels.find(c=>c.name==='UL1')?.data || []),
            ub: calcPhasor(data.channels.find(c=>c.name==='UL2')?.data || []),
            uc: calcPhasor(data.channels.find(c=>c.name==='UL3')?.data || []),
        };
    }, [data, cursor]);

    useEffect(() => {
        if (!vectorCanvasRef.current) return;
        const ctx = vectorCanvasRef.current.getContext('2d');
        if (!ctx) return;
        const w = vectorCanvasRef.current.width;
        const h = vectorCanvasRef.current.height;
        const cx = w/2, cy = h/2;

        ctx.clearRect(0,0,w,h);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0,0,w,h);

        // Grid Circles
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, w/3, 0, 2*Math.PI);
        ctx.stroke();

        if (!data) return;

        // Draw Vectors
        const drawVec = (mag: number, ang: number, color: string, maxRef: number) => {
            const len = (mag / maxRef) * (w/2 - 10);
            const rad = -ang * Math.PI / 180; // Invert angle for canvas
            const x = cx + len * Math.cos(rad);
            const y = cy + len * Math.sin(rad); // Canvas Y is down

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.stroke();
            // Dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2*Math.PI);
            ctx.fill();
        };

        const maxI = Math.max(10, phasorData.ia.mag, phasorData.ib.mag, phasorData.ic.mag);
        drawVec(phasorData.ia.mag, phasorData.ia.ang, '#FBBF24', maxI);
        drawVec(phasorData.ib.mag, phasorData.ib.ang, '#10B981', maxI);
        drawVec(phasorData.ic.mag, phasorData.ic.ang, '#EF4444', maxI);

    }, [phasorData, data]);


    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto pb-12 h-[calc(100vh-140px)] flex flex-col">
            
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Binary className="text-amber-500"/> COMTRADE Viewer
                    </h1>
                </div>
                
                <div className="flex gap-4">
                    <button onClick={loadDemo} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Play size={16} fill="currentColor"/> Load Demo Fault
                    </button>
                    <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer border border-gray-700">
                        <Upload size={16}/> Upload .CFG
                        <input type="file" className="hidden" accept=".cfg" />
                    </label>
                </div>
            </div>

            {!data && (
                <div className="flex-1 bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                    <Activity size={64} className="mb-4 opacity-50"/>
                    <p>Загрузите файл или нажмите <b>Load Demo Fault</b></p>
                </div>
            )}

            {data && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                    
                    {/* Left: Oscilloscope (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="flex-1 bg-black border border-gray-800 rounded-xl overflow-hidden relative shadow-2xl">
                            <canvas 
                                ref={oscCanvasRef} 
                                width={1200} 
                                height={600} 
                                className="w-full h-full block cursor-crosshair"
                                onMouseMove={(e) => {
                                    // Simple cursor control via mouse move over canvas (approx)
                                    // In real app, use ResizeObserver to map mouseX to data index
                                }}
                            />
                            {/* Overlay Controls */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => setZoom(z => Math.max(1, z/1.5))} className="p-2 bg-gray-800/80 rounded text-white hover:bg-gray-700"><ZoomOut size={16}/></button>
                                <button onClick={() => setZoom(z => Math.min(50, z*1.5))} className="p-2 bg-gray-800/80 rounded text-white hover:bg-gray-700"><ZoomIn size={16}/></button>
                            </div>
                        </div>
                        
                        {/* Cursor Slider */}
                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                            <MousePointer2 size={16} className="text-gray-500"/>
                            <input 
                                type="range" 
                                min="0" 
                                max={data.channels[0].data.length-1} 
                                value={cursor} 
                                onChange={e => setCursor(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="font-mono text-sm text-amber-400 w-24 text-right">
                                {(cursor/data.sampleRate * 1000).toFixed(1)} ms
                            </div>
                        </div>
                    </div>

                    {/* Right: Analytics (1 col) */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-6 overflow-y-auto">
                        
                        {/* Vector Diagram */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Phasor Diagram (Currents)</h3>
                            <div className="aspect-square bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center p-2">
                                <canvas ref={vectorCanvasRef} width={250} height={250} className="w-full h-full"/>
                            </div>
                        </div>

                        {/* Measurements Table */}
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Measurements (RMS)</h3>
                            <div className="space-y-1 font-mono text-sm">
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-amber-400 font-bold">Ia</span>
                                    <span>{phasorData.ia.mag.toFixed(2)} A ∠{phasorData.ia.ang.toFixed(0)}°</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-emerald-400 font-bold">Ib</span>
                                    <span>{phasorData.ib.mag.toFixed(2)} A ∠{phasorData.ib.ang.toFixed(0)}°</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-red-400 font-bold">Ic</span>
                                    <span>{phasorData.ic.mag.toFixed(2)} A ∠{phasorData.ic.ang.toFixed(0)}°</span>
                                </div>
                                <div className="h-4"></div>
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-amber-200">Ua</span>
                                    <span>{phasorData.ua.mag.toFixed(1)} V</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-emerald-200">Ub</span>
                                    <span>{phasorData.ub.mag.toFixed(1)} V</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-red-200">Uc</span>
                                    <span>{phasorData.uc.mag.toFixed(1)} V</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg text-xs text-amber-300 leading-relaxed">
                            <b>Note:</b> This is a client-side visualization. Real COMTRADE analysis may require converting .DAT (binary) to .CSV or JSON first.
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};