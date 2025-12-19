import React, { useState, useMemo } from 'react';
import { Wifi, Clock, Activity, Settings, AlertTriangle, CheckCircle, Server, ArrowRight, ZapOff } from 'lucide-react';

type PerfClass = 'P1' | 'P2' | 'P3';

interface TimingLimits {
    trip: number;
    transfer: number;
}

const LIMITS: Record<PerfClass, TimingLimits> = {
    'P1': { trip: 100, transfer: 10 }, // Distribution, slow (<10ms for GOOSE, <100ms Total Trip)
    'P2': { trip: 50, transfer: 3 }, // Transmission (<3ms for GOOSE)
    'P3': { trip: 30, transfer: 3 }, // Transmission, fast (<3ms for GOOSE)
};

export const RzaGooseTiming: React.FC = () => {
    // --- State ---
    const [perfClass, setPerfClass] = useState<PerfClass>('P2');
    
    // Components delays (microseconds)
    const [tPub, setTPub] = useState(1500); // 1.5 ms IED processing (Publisher)
    const [tSub, setTSub] = useState(1000); // 1.0 ms IED processing (Subscriber)
    const [switchLatency, setSwitchLatency] = useState(20); // 20 us per switch
    const [hops, setHops] = useState(2); // Number of switches
    const [cableLength, setCableLength] = useState(200); // meters
    const [breakerTime, setBreakerTime] = useState(35); // ms (Circuit Breaker opening time)

    // --- Calculations ---
    const tCable = cableLength * 0.005; // 5 ns/m -> 0.005 us/m
    const tNet = (hops * switchLatency) + tCable; // Total Network Delay (us)
    
    // Transfer Time = T_pub + T_net + T_sub
    const tTransferUs = tPub + tNet + tSub;
    const tTransferMs = tTransferUs / 1000;

    // Total Trip Time = Transfer Time + Breaker Time
    const tTotalMs = tTransferMs + breakerTime;

    const limitTransfer = LIMITS[perfClass].transfer;
    const limitTrip = LIMITS[perfClass].trip;

    const isTransferOk = tTransferMs <= limitTransfer;
    const isTripOk = tTotalMs <= limitTrip;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <Wifi className="text-emerald-500" size={40} />
                   GOOSE Timing
                </h1>
                <p className="text-gray-400">
                    Калькулятор временных задержек по стандарту IEC 61850-5.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left: Configuration */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <Settings size={18} className="text-blue-400"/> Параметры сети
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Класс производительности</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(LIMITS) as PerfClass[]).map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setPerfClass(c)}
                                            className={`py-2 rounded text-xs font-bold border transition-all ${
                                                perfClass === c 
                                                ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' 
                                                : 'bg-gray-950 border-gray-800 text-gray-500 hover:bg-gray-800'
                                            }`}
                                        >
                                            {c} (≤{LIMITS[c].transfer}ms)
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">IED Processing (µs)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block mb-1">Publisher (T_src)</span>
                                        <input type="number" value={tPub} onChange={e => setTPub(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 block mb-1">Subscriber (T_dst)</span>
                                        <input type="number" value={tSub} onChange={e => setTSub(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Network Structure</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block mb-1">Hops (Switches)</span>
                                        <input type="number" value={hops} onChange={e => setHops(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 block mb-1">Switch Latency (µs)</span>
                                        <input type="number" value={switchLatency} onChange={e => setSwitchLatency(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Total Cable (m)</label>
                                <input type="number" value={cableLength} onChange={e => setCableLength(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Время выключателя (ms)</label>
                                <input type="number" value={breakerTime} onChange={e => setBreakerTime(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Visualization */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Visual Diagram */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
                        <div className="flex items-center gap-4 relative z-10 w-full justify-between max-w-2xl">
                            
                            {/* Source IED */}
                            <div className="text-center group">
                                <div className="w-20 h-20 bg-blue-900/30 border-2 border-blue-500 rounded-xl flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    <Activity className="text-blue-400" size={32}/>
                                </div>
                                <div className="text-xs font-bold text-blue-400">IED Source</div>
                                <div className="text-[10px] text-gray-500">{tPub} µs</div>
                            </div>

                            {/* Network Path */}
                            <div className="flex-1 relative h-16 flex items-center justify-center">
                                {/* Cable Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -translate-y-1/2"></div>
                                {/* Signal Packet Animation */}
                                <div className="absolute top-1/2 left-0 w-3 h-3 bg-emerald-500 rounded-full -translate-y-1/2 animate-[ping_2s_linear_infinite]" style={{ animationDuration: '2s' }}></div>
                                
                                <div className="relative z-10 flex gap-8 bg-gray-900 px-4">
                                    {/* Switches */}
                                    {Array.from({length: Math.min(hops, 3)}).map((_, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className="p-2 bg-gray-800 border border-gray-600 rounded">
                                                <Server size={16} className="text-gray-400"/>
                                            </div>
                                            <div className="text-[9px] text-gray-500 mt-1">{switchLatency}µs</div>
                                        </div>
                                    ))}
                                    {hops > 3 && <div className="flex items-center text-gray-500 text-xs">... +{hops-3}</div>}
                                </div>
                            </div>

                            {/* Dest IED */}
                            <div className="text-center">
                                <div className="w-20 h-20 bg-purple-900/30 border-2 border-purple-500 rounded-xl flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                    <Wifi className="text-purple-400" size={32}/>
                                </div>
                                <div className="text-xs font-bold text-purple-400">IED Dest</div>
                                <div className="text-[10px] text-gray-500">{tSub} µs</div>
                            </div>

                            <ArrowRight className="text-gray-600" size={24}/>

                            {/* Breaker */}
                            <div className="text-center">
                                <div className="w-20 h-20 bg-red-900/30 border-2 border-red-500 rounded-xl flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                    <ZapOff className="text-red-400" size={32}/>
                                </div>
                                <div className="text-xs font-bold text-red-400">Breaker</div>
                                <div className="text-[10px] text-gray-500">{breakerTime} ms</div>
                            </div>
                        </div>
                    </div>

                    {/* Results Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Transfer Time Result */}
                        <div className={`border rounded-xl p-6 relative overflow-hidden transition-colors ${
                            isTransferOk 
                            ? 'bg-emerald-900/10 border-emerald-500/50' 
                            : 'bg-red-900/10 border-red-500/50'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Transfer Time (IED to IED)</h4>
                                    <div className={`text-4xl font-extrabold font-mono ${isTransferOk ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tTransferMs.toFixed(3)} <span className="text-xl">ms</span>
                                    </div>
                                </div>
                                {isTransferOk ? <CheckCircle className="text-emerald-500" size={32}/> : <AlertTriangle className="text-red-500" size={32}/>}
                            </div>
                            
                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                                <div 
                                    className={`h-full ${isTransferOk ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                    style={{ width: `${Math.min(100, (tTransferMs / limitTransfer) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between font-mono">
                                <span>0 ms</span>
                                <span>Limit: {limitTransfer} ms ({perfClass})</span>
                            </div>
                        </div>

                        {/* Total Trip Time Result */}
                        <div className={`border rounded-xl p-6 relative overflow-hidden transition-colors ${
                            isTripOk 
                            ? 'bg-blue-900/10 border-blue-500/50' 
                            : 'bg-amber-900/10 border-amber-500/50'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Total Fault Clearing Time</h4>
                                    <div className={`text-4xl font-extrabold font-mono ${isTripOk ? 'text-blue-400' : 'text-amber-400'}`}>
                                        {tTotalMs.toFixed(1)} <span className="text-xl">ms</span>
                                    </div>
                                </div>
                                <Clock className={isTripOk ? 'text-blue-500' : 'text-amber-500'} size={32}/>
                            </div>
                            
                            <div className="text-xs text-gray-400">
                                С учетом времени размыкания контактов выключателя ({breakerTime} ms).
                                <br/>
                                <span className="text-gray-500">Лимит для класса {perfClass} (ориентировочно): {limitTrip} ms</span>
                            </div>
                        </div>

                    </div>

                    {/* Breakdown */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Детализация задержек</h4>
                        <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-blue-400">Source Processing</span>
                                <span>{tPub} µs</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-gray-400">Network (Switches + Cable)</span>
                                <span>{tNet.toFixed(1)} µs</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                <span className="text-purple-400">Destination Processing</span>
                                <span>{tSub} µs</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-red-400">Breaker Mech. Delay</span>
                                <span>{breakerTime * 1000} µs</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};