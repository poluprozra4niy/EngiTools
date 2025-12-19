import React, { useState, useEffect } from 'react';
import { BookOpen, Shield, Cable, Settings, Layers, Zap, Cpu, AlertTriangle, ChevronRight, Anchor } from 'lucide-react';

const ProfibusDB9: React.FC = () => (
    <div className="bg-gray-900 p-4 rounded-lg inline-block border border-gray-700">
        <svg width="200" height="100" viewBox="0 0 160 80" className="mx-auto">
            {/* Shell */}
            <path d="M10 10 L150 10 L140 70 L20 70 Z" fill="#374151" stroke="#4B5563" strokeWidth="2" rx="5" />
            <path d="M15 15 L145 15 L137 65 L23 65 Z" fill="#1F2937" />
            
            {/* Pin 3 (B - Red) */}
             <circle cx="79" cy="30" r="5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1"/>
             <text x="79" y="48" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">3 (B)</text>
             
             {/* Pin 8 (A - Green) */}
             <circle cx="90" cy="55" r="5" fill="#10B981" stroke="#064E3B" strokeWidth="1"/>
             <text x="90" y="75" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold">8 (A)</text>
             
             {/* Pin 5 (GND) */}
             <circle cx="123" cy="30" r="4" fill="#6B7280" />
             <text x="123" y="48" textAnchor="middle" fill="#6B7280" fontSize="8">5 (GND)</text>
             
             {/* Pin 6 (5V) */}
             <circle cx="46" cy="55" r="4" fill="#F59E0B" />
             <text x="46" y="75" textAnchor="middle" fill="#F59E0B" fontSize="8">6 (5V)</text>
             
             {/* Other pins */}
             <circle cx="35" cy="30" r="3" fill="#374151" />
             <circle cx="57" cy="30" r="3" fill="#374151" />
             <circle cx="101" cy="30" r="3" fill="#374151" />
             <circle cx="68" cy="55" r="3" fill="#374151" />
             <circle cx="112" cy="55" r="3" fill="#374151" />
        </svg>
        <div className="text-center text-xs text-gray-500 mt-2 font-mono">DB9-M (Вид спереди, на штырьки)</div>
    </div>
);

export const ProfibusWiki: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 150) current = section.getAttribute('id') || '';
      });
      if (current) setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 100, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const sections = [
    { id: 'intro', title: 'Основы', icon: <BookOpen size={18}/> },
    { id: 'physics', title: 'Физика и Кабель', icon: <Cable size={18}/> },
    { id: 'pinout', title: 'Распиновка DB9', icon: <Cpu size={18}/> },
    { id: 'termination', title: 'Терминация', icon: <Zap size={18}/> },
    { id: 'addressing', title: 'Адресация', icon: <Settings size={18}/> },
  ];

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-24 space-y-2 shrink-0 bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Навигация</div>
             {sections.map(item => (
                 <button 
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded transition-colors text-sm font-medium ${
                        activeSection === item.id 
                        ? 'text-purple-300 bg-purple-500/10 border border-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                 >
                     {item.icon} {item.title}
                 </button>
             ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12 pb-24">
            
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-white mb-2">PROFIBUS <span className="text-purple-500">Wiki</span></h1>
                <p className="text-xl text-gray-400">Process Field Bus — стандарт де-факто для Siemens и европейской автоматизации.</p>
            </div>

            <section id="intro" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="text-purple-500"/> Что такое PROFIBUS DP?
                </h2>
                <div className="bg-gray-800/40 border border-gray-700 p-6 rounded-xl space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        <b>PROFIBUS DP (Decentralized Peripherals)</b> — самый распространенный вариант протокола, оптимизированный для высокой скорости и обмена данными с удаленным вводом/выводом.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><b>Master Class 1 (DPM1):</b> ПЛК (PLC), который циклически опрашивает устройства. Главный контроллер процесса.</li>
                        <li><b>Master Class 2 (DPM2):</b> Программатор, панель оператора или ноутбук с диагностикой. Используется для настройки.</li>
                        <li><b>Slave:</b> Датчики, приводы, станции ET200, частотники. Они пассивны и отвечают только на запросы.</li>
                    </ul>
                    <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 mt-4">
                        <p className="text-sm text-purple-200">
                            <b>Token Ring:</b> Если в сети несколько Мастеров, они передают друг другу специальный маркер (Token). 
                            Владеть шиной может только тот, у кого есть маркер.
                        </p>
                    </div>
                </div>
            </section>

            <section id="physics" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Cable className="text-purple-500"/> Физический уровень (RS-485)
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/40 border border-gray-700 p-6 rounded-xl">
                        <h3 className="font-bold text-white mb-2">Кабель (Type A)</h3>
                        <p className="text-sm text-gray-400 mb-4">Стандартный фиолетовый кабель.</p>
                        <ul className="text-sm space-y-2 text-gray-300 font-mono">
                            <li className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Волновое сопр.:</span> <span className="text-white">150 Ом</span>
                            </li>
                            <li className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Емкость:</span> <span className="text-white">&lt; 30 пФ/м</span>
                            </li>
                            <li className="flex justify-between border-b border-gray-700 pb-1">
                                <span>Диаметр жилы:</span> <span className="text-white">&gt; 0.34 мм² (22 AWG)</span>
                            </li>
                            <li className="flex justify-between pt-1">
                                <span>Цвет жил:</span> <span className="text-white"><span className="text-red-400">Красный</span> / <span className="text-green-400">Зеленый</span></span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-gray-800/40 border border-gray-700 p-6 rounded-xl">
                        <h3 className="font-bold text-white mb-2">Ограничения длины</h3>
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500">
                                <tr><th>Скорость</th><th>Макс. длина</th></tr>
                            </thead>
                            <tbody className="text-gray-300 divide-y divide-gray-700">
                                <tr><td className="py-2">9.6 - 93.75 kbps</td><td>1200 м</td></tr>
                                <tr><td className="py-2">187.5 kbps</td><td>1000 м</td></tr>
                                <tr><td className="py-2">500 kbps</td><td>400 м</td></tr>
                                <tr><td className="py-2">1.5 Mbps</td><td>200 м</td></tr>
                                <tr><td className="py-2">3 - 12 Mbps</td><td>100 м</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="pinout" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Cpu className="text-purple-500"/> Распиновка DB9
                </h2>
                <div className="bg-gray-800/40 border border-gray-700 p-8 rounded-xl flex flex-col items-center">
                    <ProfibusDB9 />
                    
                    <div className="mt-8 grid gap-4 w-full max-w-lg">
                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded flex items-center justify-between">
                            <span className="font-bold text-red-400">Pin 3</span>
                            <span className="font-mono text-white">RxD/TxD-P (B)</span>
                            <span className="text-sm text-gray-400">Data + (Red wire)</span>
                        </div>
                        <div className="bg-green-900/20 border border-green-500/30 p-3 rounded flex items-center justify-between">
                            <span className="font-bold text-green-400">Pin 8</span>
                            <span className="font-mono text-white">RxD/TxD-N (A)</span>
                            <span className="text-sm text-gray-400">Data - (Green wire)</span>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 p-3 rounded flex items-center justify-between text-gray-500">
                            <span className="font-bold">Pin 5</span>
                            <span className="font-mono">DGND</span>
                            <span className="text-sm">Питание терминатора (-)</span>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 p-3 rounded flex items-center justify-between text-gray-500">
                            <span className="font-bold">Pin 6</span>
                            <span className="font-mono">VP (+5V)</span>
                            <span className="text-sm">Питание терминатора (+)</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 p-3 rounded border border-amber-500/20">
                        <AlertTriangle size={16}/>
                        <span>
                            Внимание! В отличие от Modbus, здесь <b>B - это Плюс (Красный)</b>, а <b>A - это Минус (Зеленый)</b>. Не перепутайте!
                        </span>
                    </div>
                </div>
            </section>

            <section id="termination" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-purple-500"/> Активная Терминация
                </h2>
                <p className="text-gray-300 mb-4">
                    Терминаторы должны быть включены <b>ТОЛЬКО</b> на первом и последнем устройстве сегмента.
                    В Profibus используется схема из 3-х резисторов, требующая питания 5В (Pin 6).
                </p>
                <div className="bg-white p-6 rounded-xl flex justify-center mb-4">
                     {/* Schematic Visualization */}
                     <svg width="300" height="150" viewBox="0 0 300 150">
                        {/* 5V Line */}
                        <text x="10" y="20" fontSize="12" fill="#333" fontWeight="bold">VP (+5V)</text>
                        <line x1="50" y1="15" x2="250" y2="15" stroke="#333" strokeWidth="2" />
                        
                        {/* Pull Up */}
                        <rect x="140" y="15" width="20" height="30" fill="none" stroke="#333" />
                        <text x="170" y="35" fontSize="10" fill="#666">390Ω</text>
                        <line x1="150" y1="45" x2="150" y2="60" stroke="#333" strokeWidth="2" />

                        {/* Data Line B (Red) */}
                        <text x="10" y="65" fontSize="12" fill="#EF4444" fontWeight="bold">Line B (Red)</text>
                        <line x1="50" y1="60" x2="250" y2="60" stroke="#EF4444" strokeWidth="3" />
                        
                        {/* Terminator */}
                        <rect x="140" y="60" width="20" height="30" fill="none" stroke="#333" />
                        <text x="170" y="80" fontSize="10" fill="#666">220Ω</text>
                        <line x1="150" y1="90" x2="150" y2="105" stroke="#333" strokeWidth="2" />

                        {/* Data Line A (Green) */}
                        <text x="10" y="110" fontSize="12" fill="#10B981" fontWeight="bold">Line A (Green)</text>
                        <line x1="50" y1="105" x2="250" y2="105" stroke="#10B981" strokeWidth="3" />

                        {/* Pull Down */}
                        <rect x="140" y="105" width="20" height="30" fill="none" stroke="#333" />
                        <text x="170" y="125" fontSize="10" fill="#666">390Ω</text>
                        <line x1="150" y1="135" x2="150" y2="145" stroke="#333" strokeWidth="2" />

                         {/* GND Line */}
                        <text x="10" y="145" fontSize="12" fill="#333" fontWeight="bold">DGND</text>
                        <line x1="50" y1="145" x2="250" y2="145" stroke="#333" strokeWidth="2" />
                     </svg>
                </div>
                <div className="bg-gray-800/40 p-4 border-l-4 border-red-500 rounded-r text-sm text-gray-300">
                    <b>Важно:</b> Если устройство на конце линии обесточено, его терминатор перестает работать (нет 5В), и вся сеть может "лечь". 
                    Для критических узлов используйте <b>активные терминаторы</b> (отдельные устройства с внешним питанием).
                </div>
            </section>

        </div>
    </div>
  );
};