import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, X, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export const DebugOverlay: React.FC = () => {
  const { connectionError, debugInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Safely access env vars (Vite specific)
  const meta = import.meta as any;
  const viteUrl = meta.env?.VITE_SUPABASE_URL;
  const viteKey = meta.env?.VITE_SUPABASE_ANON_KEY;

  // Fallback check (sometimes useful in specific containers)
  let processUrl = undefined;
  try {
     if (typeof process !== 'undefined' && process.env) {
        processUrl = process.env.VITE_SUPABASE_URL;
     }
  } catch (e) {}

  // Determine effective values
  const envUrl = viteUrl || processUrl;
  
  const getStatusColor = (val: string | undefined) => val && val.length > 5 && !val.includes('placeholder') ? 'text-green-400' : 'text-red-400';
  const getMasked = (val: string | undefined) => {
      if (!val) return '(Undefined)';
      if (val.includes('placeholder')) return '(Placeholder Value)';
      return val.length > 10 ? `${val.substring(0, 8)}...${val.slice(-4)}` : val;
  };

  const isMissing = !envUrl || envUrl.includes('placeholder');

  return (
    <div className={`fixed bottom-4 left-4 z-[9999] font-mono text-xs transition-all duration-300 ${isOpen ? 'w-96' : 'w-auto'}`}>
      
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border backdrop-blur-md transition-colors ${
          connectionError 
            ? 'bg-red-900/90 border-red-500 text-red-200 animate-pulse' 
            : 'bg-gray-900/90 border-gray-700 text-gray-400 hover:text-white'
        }`}
      >
        <Terminal size={14} />
        {isOpen ? 'System Debug' : (connectionError ? 'DB Connection Error' : 'System OK')}
        {isOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
      </button>

      {/* Detail Panel */}
      {isOpen && (
        <div className="mt-2 bg-gray-950/95 border border-gray-700 rounded-xl p-4 text-gray-300 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                    {connectionError ? <AlertTriangle size={14} className="text-red-500"/> : <CheckCircle size={14} className="text-green-500"/>}
                    Environment Status
                </h3>
                <button onClick={() => window.location.reload()} className="p-1 hover:bg-gray-800 rounded text-blue-400" title="Reload App">
                    <RefreshCw size={12}/>
                </button>
            </div>

            <div className="space-y-4">
                
                {/* Environment Variables */}
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex justify-between">
                        <span>.env Config</span>
                        {isMissing && <span className="text-red-400 blink">MISSING</span>}
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-gray-800 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">VITE_SUPABASE_URL:</span>
                            <span className={getStatusColor(envUrl)}>{getMasked(envUrl)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">VITE_SUPABASE_ANON_KEY:</span>
                            <span className={getStatusColor(viteKey)}>{getMasked(viteKey)}</span>
                        </div>
                    </div>
                </div>

                {/* Troubleshooting Tips (Only show if error) */}
                {isMissing && (
                    <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded text-amber-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-400">
                            <HelpCircle size={14}/> Troubleshooting
                        </div>
                        <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li>Создайте файл <code>.env</code> в корне (рядом с package.json).</li>
                            <li>Переменные <b>обязательно</b> должны начинаться с <code>VITE_</code>.</li>
                            <li>
                                Пример:<br/>
                                <code>VITE_SUPABASE_URL=https://...</code>
                            </li>
                            <li><b>Перезапустите сервер</b> (Ctrl+C, npm run dev), чтобы файл подтянулся.</li>
                        </ul>
                    </div>
                )}

                {/* Connection Error Details */}
                {connectionError && (
                    <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Error Details</div>
                        <div className="bg-red-900/10 border border-red-500/20 p-2 rounded text-red-300 break-words">
                            {connectionError}
                        </div>
                    </div>
                )}

                {/* Internal State */}
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Auth Context State</div>
                    <pre className="text-[9px] bg-gray-900 p-2 rounded overflow-x-auto border border-gray-800 text-gray-400">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>

            </div>
            
            <div className="mt-4 text-[9px] text-gray-600 text-center">
                EngiTools Debugger v1.1
            </div>
        </div>
      )}
    </div>
  );
};