import React, { useState } from 'react';
    import { Cable, Gauge, ArrowRight } from 'lucide-react';

    const BAUD_RATES = [
        { value: 9.6, label: '9.6 kbit/s', maxLen: 1200 },
        { value: 19.2, label: '19.2 kbit/s', maxLen: 1200 },
        { value: 45.45, label: '45.45 kbit/s', maxLen: 1200 },
        { value: 93.75, label: '93.75 kbit/s', maxLen: 1200 },
        { value: 187.5, label: '187.5 kbit/s', maxLen: 1000 },
        { value: 500, label: '500 kbit/s', maxLen: 400 },
        { value: 1500, label: '1.5 Mbit/s', maxLen: 200 },
        { value: 3000, label: '3 Mbit/s', maxLen: 100 },
        { value: 6000, label: '6 Mbit/s', maxLen: 100 },
        { value: 12000, label: '12 Mbit/s', maxLen: 100 },
    ];

    export const ProfibusCalculator: React.FC = () => {
        const [baudRate, setBaudRate] = useState<number>(1500);
        const [devices, setDevices] = useState<number>(10);
        const [cableType, setCableType] = useState<'A' | 'B'>('A');

        const selectedRate = BAUD_RATES.find(r => r.value === baudRate) || BAUD_RATES[6];
        const maxLen = selectedRate.maxLen;
        
        // Type B cable (obsolete) reduces length
        const adjustedMaxLen = cableType === 'B' ? maxLen / 2 : maxLen;
        
        const needRepeater = devices > 32;
        const repeaterCount = Math.ceil(devices / 32) - 1;

        return (
            <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                    <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                        <Cable className="text-purple-500" size={40} />
                        Калькулятор Кабеля
                    </h1>
                    <p className="text-gray-400">
                        Расчет максимальной длины сегмента PROFIBUS DP в зависимости от скорости передачи.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Inputs */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6 shadow-xl">
                         <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Скорость передачи (Baud Rate)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {BAUD_RATES.map(rate => (
                                    <button
                                        key={rate.value}
                                        onClick={() => setBaudRate(rate.value)}
                                        className={`px-3 py-2 text-sm rounded transition-colors border ${
                                            baudRate === rate.value 
                                            ? 'bg-purple-600 border-purple-500 text-white' 
                                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                                        }`}
                                    >
                                        {rate.label}
                                    </button>
                                ))}
                            </div>
                         </div>

                         <div>
                             <label className="block text-sm font-bold text-gray-400 mb-2">Количество устройств</label>
                             <input 
                                type="number" 
                                value={devices}
                                onChange={e => setDevices(Math.max(2, parseInt(e.target.value) || 2))}
                                className="w-full bg-gray-950 border border-gray-800 rounded p-3 text-white outline-none focus:border-purple-500"
                             />
                             <p className="text-xs text-gray-500 mt-2">Включая Master, Slaves и Repeaters.</p>
                         </div>

                         <div>
                             <label className="block text-sm font-bold text-gray-400 mb-2">Тип кабеля</label>
                             <select 
                                value={cableType}
                                onChange={e => setCableType(e.target.value as 'A' | 'B')}
                                className="w-full bg-gray-950 border border-gray-800 rounded p-3 text-white outline-none focus:border-purple-500"
                             >
                                 <option value="A">Type A (Standard, Solid Core)</option>
                                 <option value="B">Type B (Obsolete / Old)</option>
                             </select>
                         </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-purple-900/50 to-gray-900 border border-purple-500/30 p-8 rounded-xl text-center relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                 <Gauge size={120} />
                             </div>
                             
                             <h3 className="text-gray-400 uppercase tracking-widest text-sm font-bold mb-2">Макс. длина сегмента</h3>
                             <div className="text-6xl font-extrabold text-white mb-2">
                                 {adjustedMaxLen} <span className="text-2xl text-purple-400">м</span>
                             </div>
                             <p className="text-sm text-gray-400">
                                 При скорости {selectedRate.label} и кабеле Type {cableType}
                             </p>
                        </div>

                        {needRepeater && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-4">
                                <div className="bg-amber-500/20 p-2 rounded text-amber-500">
                                    <ArrowRight size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Требуется Repeater!</h4>
                                    <p className="text-sm text-gray-300">
                                        Стандарт ограничивает сегмент до 32 устройств. 
                                        Вам потребуется минимум <b className="text-amber-400">{repeaterCount}</b> повторитель(я).
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700">
                             <h4 className="font-bold text-white mb-2 text-sm uppercase">Характеристики кабеля Type A</h4>
                             <ul className="space-y-2 text-xs text-gray-400 font-mono">
                                 <li className="flex justify-between"><span>Impedance:</span> <span className="text-white">135...165 Ohm</span></li>
                                 <li className="flex justify-between"><span>Capacity:</span> <span className="text-white">&lt; 30 pF/m</span></li>
                                 <li className="flex justify-between"><span>Loop Resistance:</span> <span className="text-white">&lt; 110 Ohm/km</span></li>
                                 <li className="flex justify-between"><span>Wire Gauge:</span> <span className="text-white">&gt; 0.64 mm</span></li>
                             </ul>
                        </div>
                    </div>

                </div>
            </div>
        );
    };