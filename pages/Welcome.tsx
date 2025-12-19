import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, Layers, Wifi, Zap, Lock, ArrowRight, Activity, 
  ShieldCheck, Brain, Globe, Database, Terminal, Server, 
  Network, FileText, CheckCircle2, Search
} from 'lucide-react';

// --- Mockup Components for Visual Showcase ---

const ModbusMockup = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full transform transition-transform hover:scale-[1.02] duration-500">
    <div className="bg-gray-800 p-2 flex items-center gap-2 border-b border-gray-700">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
      </div>
      <div className="text-[10px] text-gray-500 font-mono ml-2">Modbus Monitor</div>
    </div>
    <div className="p-3 space-y-2 font-mono text-xs">
      <div className="flex justify-between text-gray-500 border-b border-gray-800 pb-1">
        <span>Address</span>
        <span>Value</span>
        <span>Type</span>
      </div>
      <div className="flex justify-between items-center animate-pulse">
        <span className="text-gray-400">40001</span>
        <span className="text-emerald-400 font-bold">1450</span>
        <span className="text-gray-600">UINT16</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">40002</span>
        <span className="text-emerald-400 font-bold">23.5</span>
        <span className="text-gray-600">FLOAT</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">40003</span>
        <span className="text-red-400 font-bold">ERROR</span>
        <span className="text-gray-600">TIMEOUT</span>
      </div>
      <div className="mt-2 p-2 bg-gray-950 rounded border border-gray-800 text-[10px] text-blue-300">
        TX: 01 03 00 00 00 0A C5 CD<br/>
        RX: 01 03 14 05 AA 00 ...
      </div>
    </div>
  </div>
);

const TopologyMockup = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full transform transition-transform hover:scale-[1.02] duration-500 delay-100">
    <div className="bg-gray-800 p-2 flex items-center gap-2 border-b border-gray-700">
      <Network size={12} className="text-purple-400"/>
      <div className="text-[10px] text-gray-500 font-mono">Profibus Topology</div>
    </div>
    <div className="flex-1 p-4 relative flex items-center justify-center">
      {/* Lines */}
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-purple-900"></div>
      
      {/* Nodes */}
      <div className="flex justify-between w-full relative z-10">
        <div className="flex flex-col items-center gap-1">
           <div className="w-8 h-8 rounded-lg bg-blue-600 border border-blue-400 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white text-[10px] font-bold">PLC</div>
           <div className="text-[8px] text-green-400 bg-green-900/30 px-1 rounded">TERM</div>
        </div>
        <div className="flex flex-col items-center gap-1 mt-6">
           <div className="w-8 h-8 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-300 text-[10px]">ET200</div>
           <div className="text-[8px] text-gray-500">50m</div>
        </div>
        <div className="flex flex-col items-center gap-1">
           <div className="w-8 h-8 rounded-lg bg-gray-700 border border-purple-500 shadow-lg shadow-purple-500/20 flex items-center justify-center text-gray-300 text-[10px]">VFD</div>
           <div className="text-[8px] text-green-400 bg-green-900/30 px-1 rounded">TERM</div>
        </div>
      </div>
    </div>
  </div>
);

const AIAnalysisMockup = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full transform transition-transform hover:scale-[1.02] duration-500 delay-200">
    <div className="bg-gray-800 p-2 flex items-center gap-2 border-b border-gray-700">
      <Brain size={12} className="text-amber-400"/>
      <div className="text-[10px] text-gray-500 font-mono">Gemini AI Core</div>
    </div>
    <div className="p-3 space-y-2">
       <div className="flex gap-2">
          <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center shrink-0"><Terminal size={12} className="text-gray-400"/></div>
          <div className="bg-gray-800 rounded-lg rounded-tl-none p-2 text-[10px] text-gray-300 w-3/4">
             Анализ дампа: Обнаружен конфликт IP адресов на порту 502.
          </div>
       </div>
       <div className="flex gap-2 flex-row-reverse">
          <div className="w-6 h-6 rounded bg-indigo-900/50 flex items-center justify-center shrink-0"><Cpu size={12} className="text-indigo-400"/></div>
          <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg rounded-tr-none p-2 text-[10px] text-indigo-200 w-full">
             Рекомендация: Проверьте таблицу ARP и настройки маски подсети шлюза.
             <div className="mt-1 flex gap-1">
                <span className="bg-indigo-500/20 px-1 rounded text-[8px]">Network</span>
                <span className="bg-indigo-500/20 px-1 rounded text-[8px]">Fix</span>
             </div>
          </div>
       </div>
    </div>
  </div>
);

export const Welcome: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Modbus RTU/TCP",
      desc: "Полный набор: конвертеры, карта регистров, конструктор пакетов и живой симулятор мастера сети.",
      icon: <Cpu size={24} className="text-blue-400" />,
      borderColor: "border-blue-500/30",
      bgHover: "hover:bg-blue-900/10"
    },
    {
      title: "Profibus DP",
      desc: "Диагностика сбоев, расчет длины кабеля, проверка топологии и AI-анализ GSD файлов.",
      icon: <Layers size={24} className="text-purple-400" />,
      borderColor: "border-purple-500/30",
      bgHover: "hover:bg-purple-900/10"
    },
    {
      title: "IEC 61850 GOOSE",
      desc: "Анализатор PCAP трафика, генератор SCL конфигураций и база знаний по устранению неполадок.",
      icon: <Wifi size={24} className="text-emerald-400" />,
      borderColor: "border-emerald-500/30",
      bgHover: "hover:bg-emerald-900/10"
    },
    {
      title: "AI Ассистент",
      desc: "Встроенный ИИ-эксперт (Gemini 3.0), обученный на стандартах ПУЭ и документации Siemens/Schneider.",
      icon: <Brain size={24} className="text-amber-400" />,
      borderColor: "border-amber-500/30",
      bgHover: "hover:bg-amber-900/10"
    }
  ];

  return (
    <div className="animate-fade-in pb-12 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center py-20">
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
        
        <div className="relative z-10 space-y-8 max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-700 text-sm font-medium text-gray-300 backdrop-blur-md">
             <ShieldCheck size={16} className="text-emerald-400" /> Professional Engineering Suite
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-tight">
            Engi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-emerald-400 to-purple-500">Tools</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Единая платформа для инженеров АСУ ТП.
            <br className="hidden md:block" /> 
            От расчета кабельных линий до анализа сетевых дампов.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:scale-105"
            >
              Войти в систему <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-lg transition-all border border-gray-700 flex items-center justify-center gap-2"
            >
              Регистрация
            </button>
          </div>

          {/* --- VISUAL SHOWCASE (MOCKUPS) --- */}
          <div className="pt-16 pb-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto opacity-90">
             {/* Card 1: Modbus */}
             <div className="h-48 md:translate-y-4">
                <ModbusMockup />
             </div>
             
             {/* Card 2: AI (Center, slightly higher z-index appearance) */}
             <div className="h-48 md:-translate-y-4 relative z-10">
                <AIAnalysisMockup />
             </div>

             {/* Card 3: Topology */}
             <div className="h-48 md:translate-y-4">
                <TopologyMockup />
             </div>
          </div>
          
          <div className="pt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Lock size={12} /> Доступ к инструментам только для авторизованных пользователей
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16 bg-gradient-to-b from-transparent to-gray-900/50 rounded-3xl">
        <h2 className="text-3xl font-bold text-white text-center mb-12 flex items-center justify-center gap-3">
            <Database className="text-accent-500"/>
            Возможности Платформы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <div 
              key={idx}
              className={`bg-gray-900/50 backdrop-blur border border-gray-800 p-6 rounded-2xl transition-all duration-300 group hover:border-gray-600 ${feat.bgHover}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gray-900 border ${feat.borderColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-800 bg-gray-900/30 py-12 mt-12">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                  <div className="text-3xl font-bold text-white mb-1">Modbus</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">RTU & TCP Support</div>
              </div>
              <div>
                  <div className="text-3xl font-bold text-white mb-1">IEC 61850</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">GOOSE Analysis</div>
              </div>
              <div>
                  <div className="text-3xl font-bold text-white mb-1">Profibus</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">DP Diagnostics</div>
              </div>
              <div>
                  <div className="text-3xl font-bold text-white mb-1">AI Core</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Smart Assistant</div>
              </div>
          </div>
      </div>
    </div>
  );
};