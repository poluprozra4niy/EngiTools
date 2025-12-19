import React, { useState } from 'react';
import { 
    ClipboardList, Eye, Zap, Activity, CheckCircle2, 
    AlertTriangle, ArrowRight, ArrowLeft, Disc, FileCheck, 
    Play, ShieldCheck, Thermometer, Circle, CheckSquare, Compass
} from 'lucide-react';

interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

interface Stage {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    tasks: SubTask[];
    safetyWarning?: string;
    tool?: React.ReactNode; // Optional inline tool
}

export const RzaNavigator: React.FC = () => {
    // --- State ---
    const [currentStage, setCurrentStage] = useState(0);
    const [stages, setStages] = useState<Stage[]>([
        {
            id: 0,
            title: "Подготовка",
            description: "Организационные мероприятия и документация.",
            icon: <ClipboardList size={24}/>,
            color: "text-blue-400",
            tasks: [
                { id: 'p1', text: "Получить допуск к работам (Наряд-допуск)", completed: false },
                { id: 'p2', text: "Изучить заводскую схему и карту уставок", completed: false },
                { id: 'p3', text: "Подготовить приборы (Ретом/Omicron, Мультиметр, Мегаомметр)", completed: false },
                { id: 'p4', text: "Оградить рабочее место, вывесить плакаты", completed: false }
            ],
            safetyWarning: "Убедитесь, что ячейка обесточена и заземлена перед началом работ."
        },
        {
            id: 1,
            title: "Внешний осмотр",
            description: "Проверка качества монтажа.",
            icon: <Eye size={24}/>,
            color: "text-emerald-400",
            tasks: [
                { id: 'v1', text: "Проверить затяжку всех винтовых клемм", completed: false },
                { id: 'v2', text: "Проверить маркировку проводов (кембрики) на соответствие схеме", completed: false },
                { id: 'v3', text: "Убедиться в заземлении корпуса терминала (PE)", completed: false },
                { id: 'v4', text: "Отсутствие механических повреждений", completed: false }
            ]
        },
        {
            id: 2,
            title: "Проверка Изоляции",
            description: "Измерение сопротивления цепей.",
            icon: <ShieldCheck size={24}/>,
            color: "text-purple-400",
            tasks: [
                { id: 'i1', text: "Разомкнуть испытательные блоки токовых цепей", completed: false },
                { id: 'i2', text: "Отключить разъемы от электронного модуля (Чтобы не сжечь!)", completed: false },
                { id: 'i3', text: "Замер: Токовые цепи - Земля (> 20 МОм)", completed: false },
                { id: 'i4', text: "Замер: Цепи напряжения - Земля (> 20 МОм)", completed: false },
                { id: 'i5', text: "Замер: Оперток (+/-) - Земля (> 10 МОм)", completed: false },
                { id: 'i6', text: "Восстановить подключения после замера", completed: false }
            ],
            safetyWarning: "ВНИМАНИЕ: Высокое напряжение мегаомметра (1000В/2500В). Не касайтесь токоведущих частей. Отключите электронику!"
        },
        {
            id: 3,
            title: "Проверка ТТ (CT)",
            description: "Коэффициент трансформации и ВАХ.",
            icon: <Activity size={24}/>,
            color: "text-amber-400",
            tasks: [
                { id: 'ct1', text: "Проверка полярности (Л1-И1)", completed: false },
                { id: 'ct2', text: "Коэффициент трансформации (подать ток в первичку, измерить во вторичке)", completed: false },
                { id: 'ct3', text: "Снятие ВАХ (вольт-амперной характеристики)", completed: false },
                { id: 'ct4', text: "Заземление вторичной обмотки (только в одной точке!)", completed: false }
            ]
        },
        {
            id: 4,
            title: "Прогрузка Защит",
            description: "Проверка уставок первичным или вторичным током.",
            icon: <Zap size={24}/>,
            color: "text-red-400",
            tasks: [
                { id: 't1', text: "Подать оперток на терминал", completed: false },
                { id: 't2', text: "Ввести уставки согласно карте", completed: false },
                { id: 't3', text: "МТЗ (50/51): Проверить ток срабатывания (плавный подъем)", completed: false },
                { id: 't4', text: "МТЗ (50/51): Проверить время срабатывания (скачок тока)", completed: false },
                { id: 't5', text: "Токовая отсечка (50): Проверка мгновенного действия", completed: false }
            ]
        },
        {
            id: 5,
            title: "Комплексная проверка",
            description: "Действие на отключение выключателя.",
            icon: <Play size={24}/>,
            color: "text-cyan-400",
            tasks: [
                { id: 'c1', text: "Взвести выключатель (в тест. положении)", completed: false },
                { id: 'c2', text: "Симитировать аварию (кнопкой тест или током)", completed: false },
                { id: 'c3', text: "Убедиться в отключении выключателя", completed: false },
                { id: 'c4', text: "Проверить работу блинкера/сигнализации", completed: false },
                { id: 'c5', text: "Проверить блокировку от прыгания (Anti-pumping)", completed: false }
            ],
            safetyWarning: "Береги пальцы! Привод выключателя обладает огромной энергией."
        }
    ]);

    // Tool logic for CT Calculation
    const [ctPri, setCtPri] = useState(100);
    const [ctSecMeas, setCtSecMeas] = useState(0);
    const ctRatioCalc = ctSecMeas > 0 ? (ctPri / ctSecMeas).toFixed(2) : '-';

    const toggleTask = (taskId: string) => {
        setStages(prev => prev.map(stage => {
            if (stage.id !== currentStage) return stage;
            return {
                ...stage,
                tasks: stage.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
            };
        }));
    };

    const nextStage = () => setCurrentStage(p => Math.min(stages.length - 1, p + 1));
    const prevStage = () => setCurrentStage(p => Math.max(0, p - 1));

    const activeStageData = stages[currentStage];
    const progress = Math.round(((currentStage) / (stages.length - 1)) * 100);

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <Compass className="text-emerald-500" size={40} />
                   РЗА Навигатор
                </h1>
                <p className="text-gray-400">
                    Интерактивный помощник для пошаговой наладки ячейки.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Left: Stepper Navigation */}
                <div className="lg:col-span-1 space-y-2">
                    {stages.map((stage, idx) => (
                        <button
                            key={stage.id}
                            onClick={() => setCurrentStage(stage.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                                currentStage === stage.id 
                                ? 'bg-gray-800 border-gray-600 shadow-lg' 
                                : 'bg-transparent border-transparent hover:bg-gray-900 text-gray-500'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                                currentStage === stage.id 
                                ? `${stage.color} border-current bg-gray-900` 
                                : stage.tasks.every(t => t.completed) 
                                    ? 'bg-green-900/30 text-green-500 border-green-500/50'
                                    : 'border-gray-700 text-gray-600'
                            }`}>
                                {stage.tasks.every(t => t.completed) ? <CheckCircle2 size={16}/> : idx + 1}
                            </div>
                            <span className={`text-sm font-bold ${currentStage === stage.id ? 'text-white' : 'text-gray-500'}`}>
                                {stage.title}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right: Stage Content */}
                <div className="lg:col-span-3">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
                        
                        {/* Progress Bar Top */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>

                        {/* Stage Header */}
                        <div className="flex items-start gap-4 mb-8">
                            <div className={`p-4 rounded-xl bg-gray-800/50 border border-gray-700 ${activeStageData.color}`}>
                                {activeStageData.icon}
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{activeStageData.title}</h2>
                                <p className="text-gray-400">{activeStageData.description}</p>
                            </div>
                        </div>

                        {/* Safety Warning */}
                        {activeStageData.safetyWarning && (
                            <div className="mb-8 p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-xl flex gap-3 text-red-200">
                                <AlertTriangle className="shrink-0 text-red-500" />
                                <span className="text-sm font-medium">{activeStageData.safetyWarning}</span>
                            </div>
                        )}

                        {/* Special Tools for Stage 3 (CT) */}
                        {currentStage === 3 && (
                            <div className="mb-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Activity size={16} className="text-amber-400"/> Быстрая проверка Ктт
                                </h4>
                                <div className="flex flex-wrap gap-4 items-end text-sm">
                                    <div>
                                        <label className="block text-gray-500 mb-1">Ток перв. (А)</label>
                                        <input type="number" value={ctPri} onChange={e => setCtPri(Number(e.target.value))} className="w-24 bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 mb-1">Ток втор. (А)</label>
                                        <input type="number" value={ctSecMeas} onChange={e => setCtSecMeas(Number(e.target.value))} className="w-24 bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none"/>
                                    </div>
                                    <div className="pb-2 text-gray-300">
                                        Коэффициент: <span className="text-xl font-bold text-emerald-400 ml-2">{ctRatioCalc}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Checklist */}
                        <div className="space-y-3 flex-1">
                            {activeStageData.tasks.map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => toggleTask(task.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 group ${
                                        task.completed 
                                        ? 'bg-emerald-900/10 border-emerald-500/30' 
                                        : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                                    }`}
                                >
                                    <div className={`mt-0.5 ${task.completed ? 'text-emerald-500' : 'text-gray-600 group-hover:text-gray-500'}`}>
                                        {task.completed ? <CheckSquare size={20}/> : <div className="w-5 h-5 border-2 border-current rounded-[4px]"></div>}
                                    </div>
                                    <span className={`${task.completed ? 'text-gray-400 line-through decoration-emerald-500/50' : 'text-gray-200'}`}>
                                        {task.text}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Footer Nav */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                            <button 
                                onClick={prevStage}
                                disabled={currentStage === 0}
                                className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2 transition-colors"
                            >
                                <ArrowLeft size={18}/> Назад
                            </button>
                            <button 
                                onClick={nextStage}
                                disabled={currentStage === stages.length - 1}
                                className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                            >
                                {currentStage === stages.length - 1 ? 'Готово' : 'Далее'} <ArrowRight size={18}/>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};