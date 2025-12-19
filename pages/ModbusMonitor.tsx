import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, AlertTriangle, Zap, Server, Terminal, Clock, Trash2, Info } from 'lucide-react';
import { numToHex2, numToHex4 } from '../utils/converterUtils';

// --- Types ---
interface SimRegister {
  address: number;
  name: string;
  value: number;
  type: 'UINT16' | 'FLOAT' | 'BOOL';
  unit: string;
  min: number;
  max: number;
}

interface LogEntry {
  id: number;
  timestamp: string;
  direction: 'TX' | 'RX' | 'ERR';
  data: string;
  message?: string;
}

type ErrorType = 'NONE' | 'TIMEOUT' | 'CRC' | 'EXCEPTION';

// --- Constants ---
const INITIAL_REGISTERS: SimRegister[] = [
  { address: 40001, name: 'Motor RPM', value: 1450, type: 'UINT16', unit: 'rpm', min: 1400, max: 1500 },
  { address: 40002, name: 'Temperature', value: 45.2, type: 'FLOAT', unit: '°C', min: 40, max: 60 },
  { address: 40004, name: 'Pressure', value: 2.1, type: 'FLOAT', unit: 'bar', min: 1.8, max: 2.4 },
  { address: 40006, name: 'Valve Status', value: 1, type: 'BOOL', unit: '', min: 0, max: 1 },
  { address: 40007, name: 'Voltage L1', value: 220, type: 'UINT16', unit: 'V', min: 215, max: 225 },
  { address: 40008, name: 'Current L1', value: 5.4, type: 'FLOAT', unit: 'A', min: 4, max: 7 },
];

export const ModbusMonitor: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [registers, setRegisters] = useState<SimRegister[]>(INITIAL_REGISTERS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorType, setErrorType] = useState<ErrorType>('NONE');
  const [lastPollTime, setLastPollTime] = useState<number>(0);
  
  // Use ref for the container to manipulate scrollTop directly
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Optimized Auto-scroll: direct DOM manipulation prevents animation jank
  useEffect(() => {
    if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      simulateCycle();
    }, 1500); // Poll every 1.5s

    return () => clearInterval(interval);
  }, [isSimulating, registers, errorType]);

  const addLog = (direction: 'TX' | 'RX' | 'ERR', data: string, message?: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
    
    setLogs(prev => {
      // Keep last 100 logs to prevent memory issues, but enough for history
      const newLogs = [...prev, { id: Date.now(), timestamp: timeStr, direction, data, message }];
      return newLogs.slice(-100); 
    });
  };

  const simulateCycle = () => {
    setLastPollTime(Date.now());
    
    // 1. TX Frame (Simulated Master Request)
    // Requesting 10 registers starting from 40001
    const txFrame = "01 03 00 00 00 0A C5 CD"; 
    addLog('TX', txFrame);

    // 2. Process based on Error Type
    setTimeout(() => {
      if (errorType === 'TIMEOUT') {
        addLog('ERR', '---', 'Ошибка: Таймаут ответа (Slave не отвечает)');
        return;
      }

      if (errorType === 'CRC') {
        // Return garbage data
        const garbage = "01 03 14 FF FF AB CD 00 00 DE AD BE EF"; 
        addLog('RX', garbage, 'Ошибка CRC (Контрольная сумма не совпала)');
        return;
      }

      if (errorType === 'EXCEPTION') {
        // Modbus Exception 01 (Illegal Function)
        // Slave ID + (Func Code | 0x80) + Exception Code + CRC
        const exceptionFrame = "01 83 01 80 F0"; 
        addLog('RX', exceptionFrame, 'Exception 01: Illegal Function');
        return;
      }

      // 3. Normal Success Case
      // Update values with random noise
      setRegisters(prev => prev.map(reg => {
        let newVal = reg.value;
        if (reg.type === 'BOOL') {
            // Rarely toggle bool
            if (Math.random() > 0.9) newVal = reg.value === 1 ? 0 : 1;
        } else {
            // Add noise
            const range = reg.max - reg.min;
            const noise = (Math.random() - 0.5) * (range * 0.1);
            newVal = Math.max(reg.min, Math.min(reg.max, reg.value + noise));
        }
        return { ...reg, value: newVal };
      }));

      // Generate Valid RX Frame (Fake bytes representation)
      const rxFrame = "01 03 14 " + Array(10).fill("00").map(() => Math.floor(Math.random()*255).toString(16).toUpperCase().padStart(2,'0')).join(" ") + " CRC CRC";
      addLog('RX', rxFrame);

    }, 300); // 300ms simulated latency
  };

  const clearLogs = () => setLogs([]);

  const getErrorDescription = () => {
      switch(errorType) {
          case 'TIMEOUT': return 'Симуляция обрыва связи или отключения питания устройства. Master ждет ответа и не получает его.';
          case 'CRC': return 'Симуляция помех на линии. Пришли искаженные данные, математика (CRC) не сходится.';
          case 'EXCEPTION': return 'Устройство сообщает, что не понимает команду или адрес не существует.';
          default: return null;
      }
  };

  return (
    <div className="animate-fade-in pb-12">
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
           <Activity className="text-accent-500" size={40} />
           Живой Монитор <span className="text-xs bg-accent-600 px-2 py-1 rounded text-white font-normal uppercase tracking-wider">Demo</span>
        </h1>
        <p className="text-gray-400">
           Симулятор опроса Modbus сети в реальном времени. Включайте ошибки, чтобы увидеть реакцию системы.
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Data Grid */}
        <div className="xl:col-span-2 space-y-6">
            
            {/* Control Panel */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Server size={100} />
                </div>

                <div className="flex flex-wrap gap-6 items-center relative z-10">
                    <div>
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                                isSimulating 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500'
                            }`}
                        >
                            {isSimulating ? <Square fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} />}
                            {isSimulating ? 'Остановить опрос' : 'Запустить опрос'}
                        </button>
                    </div>

                    <div className="h-12 w-px bg-gray-700 hidden sm:block"></div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-400 uppercase font-bold mb-2 flex items-center gap-2">
                             <Zap size={14} className="text-amber-400"/> Инъекция Ошибок
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['NONE', 'TIMEOUT', 'CRC', 'EXCEPTION'] as ErrorType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setErrorType(type)}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-all ${
                                        errorType === type
                                        ? type === 'NONE' 
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                            : 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'bg-gray-950 border-gray-800 text-gray-500 hover:bg-gray-800'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-6 flex items-center gap-4 text-sm font-mono border-t border-gray-800 pt-4">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`}></span>
                        <span className="text-gray-400">{isSimulating ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <div className="text-gray-500">|</div>
                    <div className="text-gray-400">
                        Slave ID: <span className="text-white">1</span>
                    </div>
                    <div className="text-gray-500">|</div>
                    <div className="text-gray-400">
                        Poll Interval: <span className="text-white">1500ms</span>
                    </div>
                </div>
            </div>
            
            {/* Error Education Banner */}
            {errorType !== 'NONE' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                    <Info className="text-amber-500 shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-amber-400 mb-1">Режим обучения: {errorType} Error</h4>
                        <p className="text-sm text-gray-300">{getErrorDescription()}</p>
                    </div>
                </div>
            )}

            {/* Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {registers.map((reg) => (
                    <div key={reg.address} className="bg-gray-800/40 border border-gray-700 p-4 rounded-xl hover:bg-gray-800/60 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-400 font-medium">{reg.name}</span>
                            <span className="text-xs text-gray-600 font-mono">{reg.address}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-mono font-bold ${
                                reg.type === 'BOOL' 
                                    ? (reg.value ? 'text-green-400' : 'text-gray-500')
                                    : 'text-white'
                            }`}>
                                {reg.type === 'FLOAT' ? reg.value.toFixed(2) : reg.value}
                            </span>
                            <span className="text-sm text-gray-500">{reg.unit}</span>
                        </div>
                        {/* Fake Progress Bar for analog values */}
                        {reg.type !== 'BOOL' && (
                            <div className="w-full h-1 bg-gray-700 rounded-full mt-3 overflow-hidden">
                                <div 
                                    className="h-full bg-accent-500 transition-all duration-500"
                                    style={{ width: `${((reg.value - reg.min) / (reg.max - reg.min)) * 100}%` }}
                                ></div>
                            </div>
                        )}
                        {reg.type === 'BOOL' && (
                            <div className="mt-3 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${reg.value ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-700'}`}></div>
                                <span className="text-xs text-gray-500 uppercase">{reg.value ? 'Active' : 'Inactive'}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column: Terminal Log */}
        <div className="xl:col-span-1 h-full min-h-[500px]">
            <div className="bg-gray-950 rounded-xl border border-gray-800 shadow-2xl h-full flex flex-col font-mono text-xs md:text-sm">
                {/* Terminal Header */}
                <div className="bg-gray-900 px-4 py-3 rounded-t-xl border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Terminal size={14} />
                        <span className="font-bold">Traffic Log</span>
                    </div>
                    <button 
                        onClick={clearLogs} 
                        className="flex items-center gap-1.5 px-2 py-1 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400 transition-colors text-xs font-medium" 
                        title="Очистить историю"
                    >
                        <Trash2 size={14} />
                        <span>Очистить</span>
                    </button>
                </div>
                
                {/* Log Content */}
                <div 
                    ref={logsContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
                >
                    {logs.length === 0 && (
                        <div className="text-center text-gray-600 mt-20 italic">
                            Нет данных... <br/>Нажмите "Запустить опрос"
                        </div>
                    )}
                    {logs.map((log) => (
                        <div key={log.id} className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-1 opacity-60">
                                <Clock size={10} />
                                <span>{log.timestamp}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className={`font-bold shrink-0 w-8 ${
                                    log.direction === 'TX' ? 'text-blue-500' : 
                                    log.direction === 'RX' ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                    {log.direction}
                                </span>
                                <div className="break-all">
                                    <span className={`${
                                        log.direction === 'TX' ? 'text-blue-300' : 
                                        log.direction === 'RX' ? 'text-emerald-300' : 'text-red-400'
                                    }`}>
                                        {log.data}
                                    </span>
                                    {log.message && (
                                        <div className="mt-1 text-red-400 bg-red-900/10 border border-red-900/30 p-2 rounded italic">
                                            {log.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};