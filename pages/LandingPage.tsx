import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, BookOpen, Hammer, TableProperties, Activity, 
  Search, FileJson, Stethoscope, Zap, FileText, Cable, Network, FileCode,
  ArrowRight, Cpu, Wifi, Layers, Map, ShieldAlert, PenTool
} from 'lucide-react';

type ProtocolType = 'MODBUS' | 'PROFIBUS' | 'GOOSE' | 'RZA';

interface ToolCardProps {
    title: string;
    desc: string;
    icon: React.ReactNode;
    path: string;
    colorClass: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, desc, icon, path, colorClass }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(path)}
            className={`group relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl ${colorClass}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150 group-hover:scale-125 transform duration-500">
                {icon}
            </div>
            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-4 p-3 bg-gray-800/50 rounded-xl w-fit backdrop-blur-sm border border-gray-700/50 group-hover:bg-gray-800 transition-colors">
                    {icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 mb-6 flex-1">{desc}</p>
                <div className="flex items-center text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity gap-2">
                    Открыть <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </div>
            </div>
        </div>
    );
};

export const LandingPage: React.FC = () => {
    const [activeProtocol, setActiveProtocol] = useState<ProtocolType>('MODBUS');

    const protocols = [
        { 
            id: 'MODBUS', 
            label: 'Modbus', 
            icon: <Cpu size={20}/>, 
            color: 'from-blue-600 to-indigo-600', 
            border: 'border-blue-500',
            text: 'text-blue-400',
            bgHover: 'hover:bg-blue-900/20'
        },
        { 
            id: 'PROFIBUS', 
            label: 'Profibus', 
            icon: <Layers size={20}/>, 
            color: 'from-purple-600 to-pink-600', 
            border: 'border-purple-500',
            text: 'text-purple-400',
            bgHover: 'hover:bg-purple-900/20'
        },
        { 
            id: 'GOOSE', 
            label: 'IEC 61850', 
            icon: <Wifi size={20}/>, 
            color: 'from-emerald-600 to-teal-600', 
            border: 'border-emerald-500',
            text: 'text-emerald-400',
            bgHover: 'hover:bg-emerald-900/20'
        },
        { 
            id: 'RZA', 
            label: 'РЗА / Prot', 
            icon: <ShieldAlert size={20}/>, 
            color: 'from-amber-600 to-red-600', 
            border: 'border-amber-500',
            text: 'text-amber-400',
            bgHover: 'hover:bg-amber-900/20'
        }
    ];

    const tools = {
        MODBUS: [
            { title: 'Hex/Dec Converter', desc: 'Перевод чисел, разбор битов, работа со знаками (Int16/32, Float).', path: '/modbus/converter', icon: <Calculator size={24} className="text-blue-400"/> },
            { title: 'Frame Builder', desc: 'Конструктор пакетов RTU. Создание команд чтения и записи.', path: '/builder', icon: <Hammer size={24} className="text-indigo-400"/> },
            { title: 'Register Map', desc: 'Создание карты регистров и экспорт в Excel для документации.', path: '/map', icon: <TableProperties size={24} className="text-cyan-400"/> },
            { title: 'Live Monitor', desc: 'Симулятор опроса устройств. Эмуляция ошибок Timeout и CRC.', path: '/monitor', icon: <Activity size={24} className="text-blue-500"/> },
            { title: 'Wiki & Pinouts', desc: 'Справочник по протоколу, распиновки DB9/RJ45, коды ошибок.', path: '/modbus', icon: <BookOpen size={24} className="text-slate-400"/> },
        ],
        PROFIBUS: [
            { title: 'Troubleshooter', desc: 'Диагностика сбоев по симптомам (BF, SF). Чек-лист проверок.', path: '/profibus/troubleshoot', icon: <Stethoscope size={24} className="text-purple-400"/> },
            { title: 'Topology Check', desc: 'Визуализация сегмента. Проверка длины кабеля и терминаторов.', path: '/profibus/topology', icon: <Network size={24} className="text-pink-400"/> },
            { title: 'Cable Calculator', desc: 'Расчет максимальной длины в зависимости от скорости.', path: '/profibus/calculator', icon: <Cable size={24} className="text-fuchsia-400"/> },
            { title: 'I/O Mapper', desc: 'Расчет адресного пространства. Просмотр I/Q адресов модулей.', path: '/profibus/io-mapper', icon: <Map size={24} className="text-indigo-400"/> },
            { title: 'GSD Analyzer', desc: 'Анализ GSD файлов с помощью AI. Расшифровка параметров.', path: '/profibus/gsd', icon: <FileCode size={24} className="text-purple-500"/> },
            { title: 'Protocol Wiki', desc: 'Теория DP, распиновка DB9, терминаторы и правила.', path: '/profibus/wiki', icon: <BookOpen size={24} className="text-purple-400"/> },
        ],
        GOOSE: [
            { title: 'PCAP Analyzer', desc: 'Визуализация трафика из Wireshark. Анализ таймингов и статусов.', path: '/goose/analyzer', icon: <Search size={24} className="text-emerald-400"/> },
            { title: 'Config Builder', desc: 'Генератор SCL/XML конфигурации для проверки подписки.', path: '/goose/builder', icon: <FileJson size={24} className="text-teal-400"/> },
            { title: 'Troubleshooter', desc: 'База знаний по типовым проблемам (VLAN, MAC, AppID).', path: '/goose/troubleshoot', icon: <Stethoscope size={24} className="text-green-400"/> },
            { title: 'Protocol Wiki', desc: 'Теория IEC 61850-8-1, механизм Multicast и квиз.', path: '/goose/wiki', icon: <BookOpen size={24} className="text-emerald-500"/> },
        ],
        RZA: [
            { title: 'Инструментарий', desc: 'Главный хаб релейщика: калькуляторы, симуляторы и базы данных.', path: '/rza/hub', icon: <ShieldAlert size={24} className="text-amber-400"/> },
            { title: 'Калькулятор Уставок', desc: 'Расчет МТЗ, ТТ, визуализация селективности защит.', path: '/rza/calculator', icon: <Calculator size={24} className="text-amber-500"/> },
        ]
    };

    return (
        <div className="animate-fade-in pb-12">
            {/* Hero Section */}
            <div className="relative py-12 mb-12 text-center overflow-hidden rounded-3xl bg-gray-900/30 border border-gray-800">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-transparent opacity-80"></div>
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-600/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 space-y-4 px-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-xs font-mono text-gray-400 mb-2">
                        <Zap size={12} className="text-yellow-400"/> Engineering Utility Suite v3.5
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
                        Engi<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-emerald-500">Tools</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Профессиональный набор инструментов для инженеров АСУ ТП. 
                        Анализ, отладка и расчеты для промышленных протоколов.
                    </p>
                </div>
            </div>

            {/* Protocol Selectors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-5xl mx-auto px-4">
                {protocols.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setActiveProtocol(p.id as ProtocolType)}
                        className={`relative group overflow-hidden p-6 rounded-2xl border transition-all duration-300 ${
                            activeProtocol === p.id 
                            ? `bg-gray-900 ${p.border} shadow-lg shadow-${p.color.split('-')[1]}-900/20` 
                            : `bg-gray-900/40 border-gray-800 ${p.bgHover} hover:border-gray-700`
                        }`}
                    >
                        {/* Active Indicator Line */}
                        {activeProtocol === p.id && (
                             <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${p.color}`}></div>
                        )}
                        
                        <div className="flex flex-col items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl bg-gray-800 border border-gray-700 transition-colors ${
                                activeProtocol === p.id ? p.text : 'text-gray-500 group-hover:text-gray-300'
                            }`}>
                                {p.icon}
                            </div>
                            <div className="text-center">
                                <div className={`font-bold text-lg ${
                                    activeProtocol === p.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                                }`}>
                                    {p.label}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Tools Grid */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {tools[activeProtocol].map((tool, idx) => (
                        <ToolCard 
                            key={idx}
                            {...tool}
                            colorClass={
                                activeProtocol === 'MODBUS' ? 'hover:shadow-blue-900/20 hover:border-blue-500/30' : 
                                activeProtocol === 'PROFIBUS' ? 'hover:shadow-purple-900/20 hover:border-purple-500/30' :
                                activeProtocol === 'GOOSE' ? 'hover:shadow-emerald-900/20 hover:border-emerald-500/30' :
                                'hover:shadow-amber-900/20 hover:border-amber-500/30'
                            }
                        />
                    ))}
                    
                    {/* Common Report Generator Card - Always visible or added to list */}
                     <ToolCard 
                        title="Генератор Отчетов" 
                        desc="Создание актов ПНР, чек-листов и экспорт в DOC/PDF." 
                        path="/report" 
                        icon={<FileText size={24} className="text-gray-200"/>}
                        colorClass="hover:shadow-gray-700/20 hover:border-gray-500/30"
                    />
                    
                    {/* Common DWG Viewer Card */}
                     <ToolCard 
                        title="CAD Viewer" 
                        desc="Просмотр схем DWG/DXF в браузере. Управление слоями." 
                        path="/dwg" 
                        icon={<PenTool size={24} className="text-blue-300"/>}
                        colorClass="hover:shadow-blue-700/20 hover:border-blue-500/30"
                    />
                </div>
            </div>
        </div>
    );
};