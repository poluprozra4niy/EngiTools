import React, { useState } from 'react';
import { Upload, Activity, AlertCircle, FileSearch, BarChart3, Clock, Play } from 'lucide-react';

// --- Types ---
interface GoosePacket {
    id: number;
    time: number; // relative ms
    stNum: number;
    sqNum: number;
    dataset: any[];
}

interface GooseFlow {
    id: string;
    mac: string;
    appid: string;
    gocb: string;
    vlan: string;
    status: 'Healthy' | 'Warning' | 'Timeout';
    packets: GoosePacket[];
}

// --- Dynamic Mock Data Generator ---
// Deterministic random to give "same file = same result" but "diff file = diff result" feel
const generateMockData = (filename: string): GooseFlow[] => {
    // 1. Create a seed from the filename
    let seed = 0;
    for (let i = 0; i < filename.length; i++) {
        seed = ((seed << 5) - seed) + filename.charCodeAt(i);
        seed |= 0;
    }
    
    // Simple LCG random function
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const numFlows = Math.floor(random() * 3) + 1; // 1 to 3 flows
    const flows: GooseFlow[] = [];

    const vendors = ['ABB', 'Siemens', 'GE', 'SEL', 'Schneider'];
    const appIds = ['0001', '3001', 'B000', '00CA'];

    for(let f=0; f < numFlows; f++) {
        const vendor = vendors[Math.floor(random() * vendors.length)];
        const macSuffix = Math.floor(random() * 255).toString(16).toUpperCase().padStart(2, '0');
        const appId = appIds[Math.floor(random() * appIds.length)];
        const isHealthy = random() > 0.3; // 30% chance of warning

        const packets: GoosePacket[] = [];
        let time = 0;
        let st = Math.floor(random() * 50);
        let sq = 0;

        // Simulate packet sequence
        const eventCount = Math.floor(random() * 3) + 1; // How many "events" happened
        
        for(let e=0; e < eventCount; e++) {
            // Event happens, st increments, sq resets
            st++;
            sq = 0;
            const burstCount = 5 + Math.floor(random() * 3);
            
            // Burst phase (fast packets)
            for(let i=0; i<burstCount; i++) {
                packets.push({ 
                    id: packets.length, 
                    time: Math.floor(time), 
                    stNum: st, 
                    sqNum: sq++, 
                    dataset: [random() > 0.5, random() > 0.5, 0] 
                });
                time += (2 + i * 2); // 2ms, 4ms, 8ms...
            }

            // Steady state (slow packets)
            const steadyCount = 5 + Math.floor(random() * 10);
            for(let i=0; i<steadyCount; i++) {
                time += 1000; // 1s heartbeat
                packets.push({ 
                    id: packets.length, 
                    time: Math.floor(time), 
                    stNum: st, 
                    sqNum: sq++, 
                    dataset: [random() > 0.5, random() > 0.5, 0] 
                });
            }
        }

        flows.push({
            id: `flow_${f}`,
            mac: `01-0C-CD-01-00-${macSuffix}`,
            appid: `0x${appId}`,
            gocb: `${vendor}_IED/LLN0$GO$Control_${f+1}`,
            vlan: isHealthy ? '100 (P:4)' : '0 (P:0)',
            status: isHealthy ? 'Healthy' : 'Warning',
            packets: packets
        });
    }

    return flows;
};

export const GooseAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [flows, setFlows] = useState<GooseFlow[]>([]);
    const [selectedFlow, setSelectedFlow] = useState<GooseFlow | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setAnalyzing(true);
            
            // Reset state
            setFlows([]);
            setSelectedFlow(null);

            // Simulate processing delay
            setTimeout(() => {
                const data = generateMockData(uploadedFile.name + uploadedFile.size);
                setFlows(data);
                if(data.length > 0) setSelectedFlow(data[0]);
                setAnalyzing(false);
            }, 1200);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center">
                 <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                        <Activity className="text-emerald-500"/> GOOSE Analyzer
                    </h1>
                    <p className="text-gray-400 text-sm">Upload .PCAP to visualize timing, retransmissions, and datasets.</p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20">
                         <Upload size={18} />
                         {file ? 'Change File' : 'Upload .PCAP'}
                         <input type="file" className="hidden" accept=".pcap,.pcapng,.cap" onChange={handleFileUpload} />
                     </label>
                 </div>
            </div>

            {!flows.length && !analyzing && (
                <div className="flex-1 bg-gray-900/50 border border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                    <FileSearch size={64} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No capture loaded</p>
                    <p className="text-sm">Select a Wireshark capture file to begin analysis</p>
                </div>
            )}

            {analyzing && (
                 <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-white animate-pulse">Parsing packets...</p>
                    <p className="text-xs text-gray-500 mt-2">{file?.name}</p>
                 </div>
            )}

            {flows.length > 0 && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                    
                    {/* Left: Flow List */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
                        <div className="p-4 border-b border-gray-800 bg-gray-950 font-bold text-gray-400 text-xs uppercase tracking-wider flex justify-between items-center">
                            <span>Detected Streams</span>
                            <span className="bg-gray-800 text-white px-2 py-0.5 rounded-full text-[10px]">{flows.length}</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {flows.map(flow => (
                                <div 
                                    key={flow.id} 
                                    onClick={() => setSelectedFlow(flow)}
                                    className={`p-3 rounded-lg cursor-pointer border transition-all ${
                                        selectedFlow?.id === flow.id 
                                        ? 'bg-emerald-500/10 border-emerald-500/50' 
                                        : 'bg-gray-800/40 border-transparent hover:bg-gray-800'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-mono text-sm font-bold text-white">{flow.appid}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            flow.status === 'Healthy' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                        }`}>{flow.status}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 truncate mb-1" title={flow.gocb}>{flow.gocb}</div>
                                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                        <span>{flow.mac}</span>
                                        <span>VLAN: {flow.vlan}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Details & Charts */}
                    <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 pb-2">
                        
                        {/* Timing Graph (Visualizing stNum/sqNum bursts) */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-xl">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-blue-400" /> Retransmission Timeline
                            </h3>
                            {/* CSS-only simple chart for demo */}
                            <div className="h-32 flex items-end gap-0.5 border-b border-l border-gray-700 p-2 relative w-full overflow-x-auto">
                                {selectedFlow?.packets.slice(0, 50).map((pkt, i) => {
                                    // Height based on time delta (simulating T1, T2, T3)
                                    // If previous packet exists
                                    const prev = selectedFlow.packets[i-1];
                                    const delta = prev ? pkt.time - prev.time : 0;
                                    const height = Math.min(100, Math.max(5, delta / 10)); // Scale for visual
                                    const isEvent = prev && pkt.stNum !== prev.stNum;
                                    
                                    return (
                                        <div key={pkt.id} className="group relative flex-1 min-w-[6px] flex flex-col justify-end items-center hover:opacity-100 opacity-80 transition-opacity">
                                            <div 
                                                className={`w-full rounded-t ${isEvent ? 'bg-amber-500' : 'bg-blue-500/50'}`}
                                                style={{ height: `${height}%` }}
                                            ></div>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black/90 border border-gray-700 p-2 rounded text-xs z-20 w-32 backdrop-blur pointer-events-none">
                                                <div className="text-gray-400">Time: {pkt.time}ms</div>
                                                <div className="text-white">st: {pkt.stNum}, sq: {pkt.sqNum}</div>
                                                <div className="text-emerald-400">Δ: {delta}ms</div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className="absolute top-2 right-2 flex gap-4 text-[10px] bg-gray-900/80 p-1 rounded border border-gray-800">
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded"></span> Event (New stNum)</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500/50 rounded"></span> Retransmission</div>
                                </div>
                            </div>
                        </div>

                        {/* Dataset Viewer */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1 shadow-xl">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart3 size={16} className="text-purple-400" /> Dataset Content (Last Packet)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-500 border-b border-gray-800">
                                        <tr>
                                            <th className="pb-2 pl-2">Index</th>
                                            <th className="pb-2">Type</th>
                                            <th className="pb-2">Value</th>
                                            <th className="pb-2 text-right pr-2">Simulated Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800 text-gray-300">
                                        {selectedFlow?.packets[selectedFlow.packets.length-1]?.dataset.map((val, idx) => (
                                            <tr key={idx} className="hover:bg-gray-800/30">
                                                <td className="py-3 pl-2 font-mono text-gray-500">{idx}</td>
                                                <td className="py-3">BOOL</td>
                                                <td className="py-3">
                                                    <span className={`font-bold ${val ? 'text-green-400' : 'text-red-400'}`}>
                                                        {val ? 'TRUE' : 'FALSE'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right pr-2 text-xs text-gray-500">
                                                    Ok
                                                </td>
                                            </tr>
                                        ))}
                                        {!selectedFlow?.packets.length && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-4 text-gray-500">No packet data</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};