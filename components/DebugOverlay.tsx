import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, X, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const DebugOverlay: React.FC = () => {
  const { connectionError, debugInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Safely access env vars (masking values)
  const meta = import.meta as any;
  const envUrl = meta.env?.VITE_SUPABASE_URL;
  const envKey = meta.env?.VITE_SUPABASE_ANON_KEY;

  const getStatusColor = (val: string | undefined) => val && val.length > 5 ? 'text-green-400' : 'text-red-400';
  const getMasked = (val: string | undefined) => val && val.length > 10 ? `${val.substring(0, 8)}...${val.slice(-4)}` : '(Missing)';

  return (
    <div className={`fixed bottom-4 left-4 z-[9999] font-mono text-xs transition-all duration-300 ${isOpen ? 'w-80' : 'w-auto'}`}>
      
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
        {isOpen ? 'Debug Info' : (connectionError ? 'DB Error' : 'System OK')}
        {isOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
      </button>

      {/* Detail Panel */}
      {isOpen && (
        <div className="mt-2 bg-gray-950/95 border border-gray-700 rounded-xl p-4 text-gray-300 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                    {connectionError ? <AlertTriangle size={14} className="text-red-500"/> : <CheckCircle size={14} className="text-green-500"/>}
                    System Status
                </h3>
                <button onClick={() => window.location.reload()} className="p-1 hover:bg-gray-800 rounded text-blue-400" title="Reload App">
                    <RefreshCw size={12}/>
                </button>
            </div>

            <div className="space-y-3">
                
                {/* Environment Check */}
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Environment Variables (.env)</div>
                    <div className="flex justify-between">
                        <span>URL:</span>
                        <span className={getStatusColor(envUrl)}>{getMasked(envUrl)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Key:</span>
                        <span className={getStatusColor(envKey)}>{getMasked(envKey)}</span>
                    </div>
                </div>

                {/* Connection Status */}
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Supabase Connection</div>
                    <div className="bg-black/50 p-2 rounded border border-gray-800 break-all text-[10px]">
                        {connectionError ? (
                            <span className="text-red-400">{connectionError}</span>
                        ) : (
                            <span className="text-emerald-400">Connected successfully.</span>
                        )}
                    </div>
                </div>

                {/* Raw Debug Info */}
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Internal State</div>
                    <pre className="text-[9px] bg-gray-900 p-2 rounded overflow-x-auto border border-gray-800">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>

            </div>
            
            <div className="mt-4 text-[9px] text-gray-600 text-center">
                EngiTools Debugger v1.0
            </div>
        </div>
      )}
    </div>
  );
};