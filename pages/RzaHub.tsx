import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, ZapOff, Activity, Binary, BarChart3, 
  FileCheck, FileText, Compass, Bot, HardDrive, 
  Wifi, Monitor, Lock
} from 'lucide-react';

interface ToolCardProps {
    title: string;
    desc: string;
    icon: React.ReactNode;
    path?: string;
    isLocked?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, desc, icon, path, isLocked }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => !isLocked && path && navigate(path)}
            className={`relative group overflow-hidden border rounded-2xl p-6 transition-all duration-300 ${
                isLocked 
                ? 'bg-gray-900/30 border-gray-800 cursor-not-allowed opacity-60' 
                : 'bg-gray-900 border-gray-800 hover:border-amber-500/50 hover:bg-gray-800/80 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/10'
            }`}
        >
            <div className={`absolute top-0 right-0 p-4 transition-opacity scale-150 ${isLocked ? 'opacity-0' : 'opacity-5 group-hover:opacity-10 group-hover:scale-125 transform duration-500'}`}>
                {icon}
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
                <div className={`mb-4 p-3 rounded-xl w-fit backdrop-blur-sm border transition-colors ${
                    isLocked ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-800/50 border-gray-700/50 group-hover:bg-amber-900/20 group-hover:border-amber-500/30 text-amber-400'
                }`}>
                    {icon}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isLocked ? 'text-gray-500' : 'text-white'}`}>{title}</h3>
                <p className="text-sm text-gray-400 mb-6 flex-1 leading-relaxed">{desc}</p>
                
                {isLocked ? (
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                        <Lock size={12} /> В разработке
                    </div>
                ) : (
                    <div className="flex items-center text-xs font-bold uppercase tracking-wider text-amber-500 opacity-80 group-hover:opacity-100 transition-opacity">
                        Открыть
                    </div>
                )}
            </div>
        </div>
    );
};

export const RzaHub: React.FC = () => {
    const tools = [
        {
            title: "Калькулятор Уставок",
            desc: "Расчет МТЗ (50/51), ТО, ДЗТ. Учет схемы ТТ и насыщения. Визуализация кривых.",
            icon: <ZapOff size={24} />,
            path: "/rza/calculator?tab=calc",
            isLocked: false
        },
        {
            title: "Первичка ↔ Вторичка",
            desc: "Умный пересчет токов с учетом коэффициента ТТ и схемы соединения (Y/Δ).",
            icon: <Activity size={24} />,
            path: "/rza/calculator?tab=ct", 
            isLocked: false
        },
        {
            title: "Карта Селективности",
            desc: "Построение ВТХ для нескольких защит. Поиск перекрытий и конфликтов.",
            icon: <BarChart3 size={24} />,
            path: "/rza/calculator?tab=chart",
            isLocked: false
        },
        {
            title: "Симулятор Аварий",
            desc: "Моделирование КЗ (1ф, 2ф, 3ф) и реакции защит. Расчет остаточных напряжений и векторная диаграмма.",
            icon: <ShieldAlert size={24} />,
            path: "/rza/calculator?tab=fault",
            isLocked: false
        },
        {
            title: "Сработает ли защита?",
            desc: "Быстрая проверка: вводите ток КЗ и уставки — получаете время срабатывания.",
            icon: <FileCheck size={24} />,
            path: "/rza/calculator?tab=trip_check",
            isLocked: false
        },
        {
            title: "COMTRADE Анализ",
            desc: "Загрузка осциллограмм, просмотр векторов, гармоник и логических сигналов.",
            icon: <Binary size={24} />,
            path: "/rza/comtrade",
            isLocked: false
        },
        {
            title: "База Терминалов",
            desc: "Справочник по Sepam, SIPROTEC, БМРЗ: типовые схемы и карты регистров.",
            icon: <HardDrive size={24} />,
            path: "/rza/database",
            isLocked: false
        },
        {
            title: "Генератор Отчетов",
            desc: "Автоматическое создание протоколов наладки и таблиц уставок в PDF.",
            icon: <FileText size={24} />,
            path: "/report?template=RZA", 
            isLocked: false 
        },
        {
            title: "РЗА Навигатор",
            desc: "Пошаговый гид по наладке: от проверки монтажа до комплексных испытаний.",
            icon: <Compass size={24} />,
            path: "/rza/navigator",
            isLocked: false
        },
        {
            title: "AI-Помощник РЗА",
            desc: "Нейросеть для анализа логики защит и поиска ошибок в параметрировании.",
            icon: <Bot size={24} />,
            path: "/rza/ai-assistant",
            isLocked: false
        },
        {
            title: "РЗА + GOOSE",
            desc: "Проверка таймингов передачи GOOSE-сообщений между терминалами.",
            icon: <Wifi size={24} />,
            path: "/rza/goose-timing",
            isLocked: false
        },
        {
            title: "Виртуальное Реле",
            desc: "Симулятор интерфейса терминала. Тренировка ввода уставок без 'железа'.",
            icon: <Monitor size={24} />,
            path: "/rza/virtual-relay",
            isLocked: false // Unlocked!
        }
    ];

    return (
        <div className="animate-fade-in pb-12">
            <div className="relative py-12 mb-12 text-center overflow-hidden rounded-3xl bg-amber-950/20 border border-amber-900/30">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-transparent opacity-80"></div>
                
                <div className="relative z-10 space-y-4 px-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-700/50 text-xs font-mono text-amber-400 mb-2">
                        <ZapOff size={12} className="text-amber-400"/> Protection & Automation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
                        Раздел <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-500">РЗА</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Профессиональные инструменты для релейщиков. Расчет уставок, анализ аварий и проверка селективности.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {tools.map((tool, idx) => (
                    <ToolCard key={idx} {...tool} />
                ))}
            </div>
        </div>
    );
};