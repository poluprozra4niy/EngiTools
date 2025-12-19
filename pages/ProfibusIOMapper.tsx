import React, { useState, useMemo } from 'react';
import { 
  Map, Plus, Trash2, ArrowRight, AlertTriangle, 
  Layers, ArrowDown, Cpu, Binary, X
} from 'lucide-react';

interface ModuleDef {
  id: string;
  name: string;
  inBytes: number;
  outBytes: number;
  type: 'Digital' | 'Analog' | 'Special';
  desc: string;
}

interface RackSlot {
  id: string; // unique instance id
  module: ModuleDef;
}

const AVAILABLE_MODULES: ModuleDef[] = [
  { id: 'di_8', name: 'DI 8xDC24V', inBytes: 1, outBytes: 0, type: 'Digital', desc: '1 Byte Input' },
  { id: 'do_8', name: 'DO 8xDC24V', inBytes: 0, outBytes: 1, type: 'Digital', desc: '1 Byte Output' },
  { id: 'di_16', name: 'DI 16xDC24V', inBytes: 2, outBytes: 0, type: 'Digital', desc: '2 Bytes Input' },
  { id: 'do_16', name: 'DO 16xDC24V', inBytes: 0, outBytes: 2, type: 'Digital', desc: '2 Bytes Output' },
  { id: 'ai_2', name: 'AI 2x12Bit', inBytes: 4, outBytes: 0, type: 'Analog', desc: '2 Words Input' },
  { id: 'ai_4', name: 'AI 4x12Bit', inBytes: 8, outBytes: 0, type: 'Analog', desc: '4 Words Input' },
  { id: 'ao_2', name: 'AO 2x12Bit', inBytes: 0, outBytes: 4, type: 'Analog', desc: '2 Words Output' },
  { id: 'univ', name: 'Universal Mod', inBytes: 4, outBytes: 4, type: 'Special', desc: '4 In / 4 Out' },
  { id: 'drive_pzd', name: 'Drive PZD 4/4', inBytes: 8, outBytes: 8, type: 'Special', desc: 'VFD Control' },
];

export const ProfibusIOMapper: React.FC = () => {
  const [startAddrI, setStartAddrI] = useState<number>(0);
  const [startAddrQ, setStartAddrQ] = useState<number>(0);
  const [rack, setRack] = useState<RackSlot[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Add module to rack
  const addModule = (mod: ModuleDef) => {
    setRack(prev => [...prev, { id: Date.now().toString(), module: mod }]);
  };

  // Remove module
  const removeModule = (instanceId: string) => {
    setRack(prev => prev.filter(slot => slot.id !== instanceId));
  };

  // Remove ALL modules
  const handleClearClick = () => {
      setIsConfirmOpen(true);
  };

  const confirmClear = () => {
      setRack([]);
      setIsConfirmOpen(false);
  };

  // Move module up
  const moveUp = (index: number) => {
    if (index === 0) return;
    setRack(prev => {
      const newRack = [...prev];
      [newRack[index - 1], newRack[index]] = [newRack[index], newRack[index - 1]];
      return newRack;
    });
  };

  // Calculate Addresses
  const mappedRack = useMemo(() => {
    let currentI = startAddrI;
    let currentQ = startAddrQ;

    return rack.map(slot => {
      const iStart = currentI;
      const qStart = currentQ;
      
      const iEnd = slot.module.inBytes > 0 ? currentI + slot.module.inBytes - 1 : null;
      const qEnd = slot.module.outBytes > 0 ? currentQ + slot.module.outBytes - 1 : null;

      currentI += slot.module.inBytes;
      currentQ += slot.module.outBytes;

      return {
        ...slot,
        addrI: slot.module.inBytes > 0 ? `${iStart} ... ${iEnd}` : '-',
        addrQ: slot.module.outBytes > 0 ? `${qStart} ... ${qEnd}` : '-',
        iRange: slot.module.inBytes > 0 ? [iStart, iEnd] : null,
        qRange: slot.module.outBytes > 0 ? [qStart, qEnd] : null
      };
    });
  }, [rack, startAddrI, startAddrQ]);

  const totalIn = mappedRack.reduce((acc, s) => acc + s.module.inBytes, 0);
  const totalOut = mappedRack.reduce((acc, s) => acc + s.module.outBytes, 0);
  
  const MAX_FRAME = 244; // Profibus DP Max User Data

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12 relative">
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
           <Map className="text-purple-500" size={40} />
           I/O Mapper
        </h1>
        <p className="text-gray-400">
           Калькулятор адресного пространства. Проверьте раскладку байтов и избегайте смещения адресов.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Library (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sticky top-24">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                 <Layers size={18} className="text-gray-400"/> Библиотека
              </h3>
              <div className="space-y-2">
                 {AVAILABLE_MODULES.map(mod => (
                    <button 
                      key={mod.id}
                      onClick={() => addModule(mod)}
                      className="w-full text-left bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-purple-500/50 p-3 rounded-lg group transition-all"
                    >
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-200 text-sm">{mod.name}</span>
                          <Plus size={14} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
                       </div>
                       <div className="text-[10px] text-gray-500 flex justify-between">
                          <span>In: {mod.inBytes}B / Out: {mod.outBytes}B</span>
                       </div>
                    </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Center: Rack Config (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
            
            {/* Start Address Config */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 items-center justify-center flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-400">Input Start:</span>
                        <input 
                          type="number" 
                          value={startAddrI} 
                          onChange={e => setStartAddrI(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 bg-gray-950 border border-gray-700 rounded p-1 text-center text-white font-mono"
                        />
                    </div>
                    <div className="w-px h-8 bg-gray-800 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-400">Output Start:</span>
                        <input 
                          type="number" 
                          value={startAddrQ} 
                          onChange={e => setStartAddrQ(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 bg-gray-950 border border-gray-700 rounded p-1 text-center text-white font-mono"
                        />
                    </div>
                </div>

                {rack.length > 0 && (
                     <button 
                        onClick={handleClearClick}
                        className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 rounded-lg transition-colors border border-red-500/20 text-xs font-bold"
                        title="Удалить все модули"
                     >
                        <Trash2 size={14} /> <span className="hidden sm:inline">Очистить</span>
                     </button>
                )}
            </div>

            {/* The Rack */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
               <div className="grid grid-cols-12 bg-gray-900 text-xs uppercase font-bold text-gray-500 p-3 border-b border-gray-800">
                  <div className="col-span-1 text-center">Slot</div>
                  <div className="col-span-5">Module</div>
                  <div className="col-span-2 text-center text-emerald-500">I-Addr</div>
                  <div className="col-span-2 text-center text-blue-500">Q-Addr</div>
                  <div className="col-span-2 text-right">Action</div>
               </div>

               <div className="divide-y divide-gray-800">
                  {mappedRack.length === 0 && (
                      <div className="p-8 text-center text-gray-600 italic">
                          Стойка пуста. Добавьте модули из библиотеки слева.
                      </div>
                  )}
                  {mappedRack.map((slot, idx) => (
                      <div key={slot.id} className="grid grid-cols-12 items-center p-3 hover:bg-gray-800/50 transition-colors group">
                          <div className="col-span-1 text-center font-mono text-gray-500">{idx + 1}</div>
                          <div className="col-span-5">
                             <div className="font-bold text-white text-sm">{slot.module.name}</div>
                             <div className="text-[10px] text-gray-500">{slot.module.desc}</div>
                          </div>
                          <div className="col-span-2 text-center font-mono text-sm text-emerald-300 bg-emerald-900/10 rounded py-1 border border-emerald-900/20">
                             {slot.addrI}
                          </div>
                          <div className="col-span-2 text-center font-mono text-sm text-blue-300 bg-blue-900/10 rounded py-1 border border-blue-900/20 ml-2">
                             {slot.addrQ}
                          </div>
                          <div className="col-span-2 flex justify-end gap-1">
                             {idx > 0 && (
                                 <button onClick={() => moveUp(idx)} className="p-1.5 text-gray-600 hover:text-white rounded hover:bg-gray-700" title="Move Up">
                                    <ArrowDown className="rotate-180" size={14}/>
                                 </button>
                             )}
                             <button onClick={() => removeModule(slot.id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded hover:bg-red-900/20" title="Remove">
                                <Trash2 size={14}/>
                             </button>
                          </div>
                      </div>
                  ))}
               </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-sm text-gray-400 flex items-start gap-3">
               <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5"/>
               <div>
                  <strong className="text-amber-400">Совет:</strong> Если вы удалите модуль из середины, адреса всех последующих модулей сместятся. 
                  Это главная причина, почему PLC перестает видеть данные ("съехавшие байты").
               </div>
            </div>

        </div>

        {/* Right: Statistics (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
             <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sticky top-24">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                   <Cpu size={18} className="text-gray-400"/> Статистика
                </h3>
                
                <div className="space-y-4">
                   {/* Input Usage */}
                   <div>
                       <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Input Data</span>
                          <span className={totalIn > MAX_FRAME ? 'text-red-400 font-bold' : 'text-emerald-400'}>{totalIn} / {MAX_FRAME} Bytes</span>
                       </div>
                       <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${totalIn > MAX_FRAME ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(100, (totalIn/MAX_FRAME)*100)}%`}}></div>
                       </div>
                   </div>

                   {/* Output Usage */}
                   <div>
                       <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Output Data</span>
                          <span className={totalOut > MAX_FRAME ? 'text-red-400 font-bold' : 'text-blue-400'}>{totalOut} / {MAX_FRAME} Bytes</span>
                       </div>
                       <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${totalOut > MAX_FRAME ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, (totalOut/MAX_FRAME)*100)}%`}}></div>
                       </div>
                   </div>

                   {/* Limits Warning */}
                   {(totalIn > MAX_FRAME || totalOut > MAX_FRAME) && (
                       <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 flex gap-2">
                          <AlertTriangle size={16}/>
                          Превышен лимит данных кадра DP-V0 (244 байта). Устройство может не запуститься.
                       </div>
                   )}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Address Map View</h4>
                    <div className="space-y-1 font-mono text-[10px]">
                        {mappedRack.map(s => s.module.inBytes > 0 && (
                            <div key={s.id} className="flex justify-between text-emerald-500/80">
                                <span>I {s.addrI}</span>
                                <span className="text-gray-600 truncate max-w-[80px] text-right">{s.module.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

             </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full relative">
                  <button 
                      onClick={() => setIsConfirmOpen(false)}
                      className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                          <Trash2 size={32} className="text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Очистить стойку?</h3>
                      <p className="text-gray-400 text-sm mb-6">
                          Вы собираетесь удалить все модули из текущей конфигурации. Это действие нельзя отменить.
                      </p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setIsConfirmOpen(false)}
                              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                          >
                              Отмена
                          </button>
                          <button 
                              onClick={confirmClear}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-600/20"
                          >
                              Удалить все
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};