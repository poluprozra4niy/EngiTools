import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Server, Database, Activity, Wifi, ShieldQuestion, 
  Cpu, Layers, AlertTriangle, FileDigit, Settings, Plug,
  ArrowRight, Hash, CheckCircle2, ChevronRight, Cable
} from 'lucide-react';

// --- Content Data Structure ---

interface WikiSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

// --- Visual Components for Pinouts ---

const DB9Connector: React.FC = () => (
  <div className="bg-gray-900 p-4 rounded-lg inline-block border border-gray-700">
    <svg width="160" height="80" viewBox="0 0 160 80" className="mx-auto">
        {/* Shell */}
        <path d="M10 10 L150 10 L140 70 L20 70 Z" fill="#374151" stroke="#4B5563" strokeWidth="2" rx="5" />
        <path d="M15 15 L145 15 L137 65 L23 65 Z" fill="#1F2937" />
        
        {/* Pins Top Row (1-5) */}
        <circle cx="35" cy="30" r="4" fill="#FBBF24" /> {/* 1 */}
        <text x="35" y="50" textAnchor="middle" fill="#6B7280" fontSize="10">1</text>
        
        <circle cx="57" cy="30" r="4" fill="#FBBF24" /> {/* 2 */}
        <text x="57" y="50" textAnchor="middle" fill="#6B7280" fontSize="10">2</text>
        
        <circle cx="79" cy="30" r="4" fill="#FBBF24" /> {/* 3 */}
        <text x="79" y="50" textAnchor="middle" fill="#6B7280" fontSize="10">3</text>
        
        <circle cx="101" cy="30" r="4" fill="#FBBF24" /> {/* 4 */}
        <text x="101" y="50" textAnchor="middle" fill="#6B7280" fontSize="10">4</text>
        
        <circle cx="123" cy="30" r="4" fill="#FBBF24" /> {/* 5 */}
        <text x="123" y="50" textAnchor="middle" fill="#6B7280" fontSize="10">5</text>

        {/* Pins Bottom Row (6-9) */}
        <circle cx="46" cy="55" r="4" fill="#D97706" /> {/* 6 */}
        <text x="46" y="75" textAnchor="middle" fill="#6B7280" fontSize="10">6</text>
        
        <circle cx="68" cy="55" r="4" fill="#D97706" /> {/* 7 */}
        <text x="68" y="75" textAnchor="middle" fill="#6B7280" fontSize="10">7</text>
        
        <circle cx="90" cy="55" r="4" fill="#D97706" /> {/* 8 */}
        <text x="90" y="75" textAnchor="middle" fill="#6B7280" fontSize="10">8</text>
        
        <circle cx="112" cy="55" r="4" fill="#D97706" /> {/* 9 */}
        <text x="112" y="75" textAnchor="middle" fill="#6B7280" fontSize="10">9</text>
    </svg>
    <div className="text-center text-xs text-gray-500 mt-2">DB9 (Вид спереди, Male)</div>
  </div>
);

const RJ45Connector: React.FC = () => (
    <div className="bg-gray-900 p-4 rounded-lg inline-block border border-gray-700">
      <svg width="120" height="100" viewBox="0 0 120 100" className="mx-auto">
          {/* Body */}
          <rect x="10" y="10" width="100" height="80" rx="4" fill="transparent" stroke="#4B5563" strokeWidth="2" />
          <rect x="20" y="20" width="80" height="60" rx="2" fill="#1F2937" />
          
          {/* Pins */}
          {[0,1,2,3,4,5,6,7].map(i => (
              <rect key={i} x={26 + (i * 9)} y="25" width="4" height="40" fill="#FBBF24" />
          ))}
          
          {/* Pin Numbers */}
          {[1,2,3,4,5,6,7,8].map((n, i) => (
             <text key={i} x={28 + (i * 9)} y="80" textAnchor="middle" fill="#6B7280" fontSize="8">{n}</text>
          ))}
      </svg>
      <div className="text-center text-xs text-gray-500 mt-2">RJ45 (8P8C)</div>
    </div>
);

export const ModbusInfo: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  // Handle scroll spy to update active section in sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id') || '';
        }
      });
      
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100, // Offset for navbar
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  const sections: WikiSection[] = [
    {
      id: 'intro',
      title: 'Введение и Основы',
      icon: <ShieldQuestion size={18} />,
      content: (
        <div className="space-y-4">
          <p className="text-lg text-gray-300 leading-relaxed">
            <b>Modbus</b> — это коммуникационный протокол, разработанный компанией Modicon (ныне Schneider Electric) в 1979 году. 
            Это "де-факто" стандарт в промышленной автоматизации. Он прост, надежен и, самое главное, открыт и бесплатен.
          </p>
          <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-accent-500">
            <h4 className="font-bold text-white mb-2">Архитектура Master-Slave (Клиент-Сервер)</h4>
            <p className="text-gray-400">
              Сеть всегда состоит из одного <b>Master</b> (Ведущего) и нескольких <b>Slave</b> (Ведомых).
              Slave не может начать передачу данных сам — он "молчит", пока его не спросят.
              Master по очереди опрашивает устройства. Если ответа нет за определенное время — возникает <b>Timeout</b>.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'datamodel',
      title: 'Модель Данных',
      icon: <Database size={18} />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-300">
            Modbus оперирует четырьмя таблицами данных. Главное отличие — кто может писать в таблицу и каков тип данных (бит или слово).
          </p>
          
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left bg-gray-900/50">
              <thead className="bg-gray-800 text-gray-200">
                <tr>
                  <th className="p-4">Тип данных</th>
                  <th className="p-4">Размер</th>
                  <th className="p-4">Доступ</th>
                  <th className="p-4">Примеры</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-400">
                <tr>
                  <td className="p-4 font-bold text-emerald-400">Discrete Inputs</td>
                  <td className="p-4">1 Бит</td>
                  <td className="p-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs border border-gray-700">Read Only</span></td>
                  <td className="p-4">Концевик, датчик движения, кнопка</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-blue-400">Coils (Катушки)</td>
                  <td className="p-4">1 Бит</td>
                  <td className="p-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs border border-gray-700 text-white">Read / Write</span></td>
                  <td className="p-4">Реле, пуск мотора, лампочка</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-purple-400">Input Registers</td>
                  <td className="p-4">16 Бит (Word)</td>
                  <td className="p-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs border border-gray-700">Read Only</span></td>
                  <td className="p-4">Температура, давление, вес (сырые данные АЦП)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-amber-400">Holding Registers</td>
                  <td className="p-4">16 Бит (Word)</td>
                  <td className="p-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs border border-gray-700 text-white">Read / Write</span></td>
                  <td className="p-4">Уставки, настройки PID, часы, счетчики</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-900/10 p-4 rounded-lg border border-amber-500/20">
             <h4 className="flex items-center gap-2 font-bold text-amber-400 mb-2">
                <AlertTriangle size={16}/> Путаница с адресацией
             </h4>
             <p className="text-gray-300 text-sm">
                В документации к приборам часто пишут "Логический адрес 40001". 
                В протоколе же (в байтах) адрес передается со смещением -1. <br/>
                То есть, чтобы прочитать <b>40001</b>, Master запрашивает адрес <b>0</b>. <br/>
                Чтобы прочитать <b>40010</b>, Master запрашивает адрес <b>9</b>.
             </p>
          </div>
        </div>
      )
    },
    {
      id: 'layers',
      title: 'Физические уровни',
      icon: <Layers size={18} />,
      content: (
        <div className="grid md:grid-cols-2 gap-6">
           <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Plug size={18} className="text-accent-500"/> Modbus RTU (RS-485)</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Самый популярный вариант.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Использует витую пару (A и B).</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Помехоустойчив (до 1200 метров).</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Топология: "Шина" (Daisy Chain). Звезда не рекомендуется.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Обязательны терминаторы 120 Ом на концах линии.</li>
              </ul>
           </div>
           <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-700">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Wifi size={18} className="text-blue-500"/> Modbus TCP (Ethernet)</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Работает поверх сетей Ethernet.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Вместо Slave ID используется IP-адрес + Unit ID.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Порт по умолчанию: 502.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-1 text-green-500 shrink-0"/> Нет контрольной суммы (CRC), т.к. TCP/IP гарантирует доставку.</li>
              </ul>
           </div>
        </div>
      )
    },
    {
      id: 'pinouts',
      title: 'Распиновка (Pinout)',
      icon: <Cable size={18} />,
      content: (
        <div className="space-y-12">
            
            {/* RS-232 & RS-485 Section */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* RS-232 */}
                <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 flex flex-col items-center">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                        <span className="text-blue-400">RS-232</span> (DB9 Standard)
                    </h3>
                    <DB9Connector />
                    <div className="mt-6 w-full max-w-xs">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900 text-gray-400">
                                <tr>
                                    <th className="py-2 px-3 text-center">Pin</th>
                                    <th className="py-2 px-3 text-left">Signal</th>
                                    <th className="py-2 px-3 text-left">Desc</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-accent-400">2</td>
                                    <td className="py-2 px-3">RX</td>
                                    <td className="py-2 px-3 text-gray-500">Receive Data</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-accent-400">3</td>
                                    <td className="py-2 px-3">TX</td>
                                    <td className="py-2 px-3 text-gray-500">Transmit Data</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-gray-500">5</td>
                                    <td className="py-2 px-3">GND</td>
                                    <td className="py-2 px-3 text-gray-500">Ground</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RS-485 */}
                <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 flex flex-col items-center">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                        <span className="text-orange-400">RS-485</span> (Terminal)
                    </h3>
                    
                    {/* Minimal Terminal Block Visual */}
                    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 flex gap-1">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-3 h-3 bg-gray-600 rounded-full border-2 border-gray-500 mb-1"></div>
                            <div className="w-10 h-12 bg-green-600 rounded border border-green-700 flex items-center justify-center font-bold text-white shadow-lg">A+</div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-3 h-3 bg-gray-600 rounded-full border-2 border-gray-500 mb-1"></div>
                            <div className="w-10 h-12 bg-green-600 rounded border border-green-700 flex items-center justify-center font-bold text-white shadow-lg">B-</div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-3 h-3 bg-gray-600 rounded-full border-2 border-gray-500 mb-1"></div>
                            <div className="w-10 h-12 bg-gray-600 rounded border border-gray-700 flex items-center justify-center font-bold text-gray-400 shadow-lg">G</div>
                        </div>
                    </div>

                    <div className="mt-6 w-full text-sm text-gray-400 space-y-3">
                        <div className="bg-amber-900/20 p-3 rounded border border-amber-500/20 text-center">
                            <p className="text-amber-400 font-bold mb-1">Внимание!</p>
                            <p>У RS-485 нет стандарта для разъема DB9. <br/> Производители используют разные пины.</p>
                        </div>
                        <p className="text-center px-4">
                            Всегда ориентируйтесь на маркировку: <br/>
                            <span className="text-white font-bold">Data+ (A)</span> и <span className="text-white font-bold">Data- (B)</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modbus TCP (RJ45) */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
                 <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg justify-center">
                    <span className="text-emerald-400">Modbus TCP</span> (Ethernet T568B)
                </h3>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                     <RJ45Connector />

                     <div className="w-full max-w-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900 text-gray-400">
                                <tr>
                                    <th className="py-2 px-3 text-center">Pin</th>
                                    <th className="py-2 px-3 text-left">Color</th>
                                    <th className="py-2 px-3 text-left">Signal (10/100)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-gray-500">1</td>
                                    <td className="py-2 px-3 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-300 border border-orange-500"></div> Orange/White</td>
                                    <td className="py-2 px-3 text-emerald-400 font-bold">TX+</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-gray-500">2</td>
                                    <td className="py-2 px-3 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Orange</td>
                                    <td className="py-2 px-3 text-emerald-400 font-bold">TX-</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-gray-500">3</td>
                                    <td className="py-2 px-3 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-300 border border-green-500"></div> Green/White</td>
                                    <td className="py-2 px-3 text-blue-400 font-bold">RX+</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-center font-bold text-gray-500">6</td>
                                    <td className="py-2 px-3 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-600"></div> Green</td>
                                    <td className="py-2 px-3 text-blue-400 font-bold">RX-</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-500 mt-2 text-center">Пины 4, 5, 7, 8 обычно не используются для данных в 100Base-T.</p>
                     </div>
                </div>
            </div>
        </div>
      )
    },
    {
      id: 'frame',
      title: 'Структура Кадра (RTU)',
      icon: <FileDigit size={18} />,
      content: (
        <div className="space-y-4">
           <p className="text-gray-300">Пакет Modbus RTU (ADU) выглядит следующим образом:</p>
           
           <div className="flex flex-col md:flex-row gap-2 font-mono text-center text-sm">
              <div className="p-4 bg-gray-800 border border-gray-600 rounded flex-1">
                 <div className="text-gray-500 text-xs uppercase mb-1">1 Байт</div>
                 <div className="font-bold text-blue-400">Slave ID</div>
                 <div className="text-xs text-gray-500 mt-1">Адрес (1-247)</div>
              </div>
              <div className="p-4 bg-gray-800 border border-gray-600 rounded flex-1">
                 <div className="text-gray-500 text-xs uppercase mb-1">1 Байт</div>
                 <div className="font-bold text-purple-400">Function</div>
                 <div className="text-xs text-gray-500 mt-1">Код команды</div>
              </div>
              <div className="p-4 bg-gray-800 border border-gray-600 rounded flex-[2]">
                 <div className="text-gray-500 text-xs uppercase mb-1">N Байт</div>
                 <div className="font-bold text-white">Data</div>
                 <div className="text-xs text-gray-500 mt-1">Адреса, значения, кол-во</div>
              </div>
              <div className="p-4 bg-gray-800 border border-gray-600 rounded flex-1">
                 <div className="text-gray-500 text-xs uppercase mb-1">2 Байта</div>
                 <div className="font-bold text-red-400">CRC-16</div>
                 <div className="text-xs text-gray-500 mt-1">Контрольная сумма</div>
              </div>
           </div>

           <p className="text-sm text-gray-400 mt-2">
             Между пакетами должна быть тишина на линии длительностью не менее 3.5 символов. Это сигнал для устройств, что пакет закончился.
           </p>
        </div>
      )
    },
    {
      id: 'functions',
      title: 'Коды Функций',
      icon: <Settings size={18} />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">Самые часто используемые команды:</p>
          <div className="grid gap-3">
             {[
               { code: '01', name: 'Read Coils', desc: 'Чтение значений выходов (0/1)' },
               { code: '02', name: 'Read Discrete Inputs', desc: 'Чтение значений входов (0/1)' },
               { code: '03', name: 'Read Holding Registers', desc: 'Чтение регистров хранения (самая частая команда)' },
               { code: '04', name: 'Read Input Registers', desc: 'Чтение входных регистров' },
               { code: '05', name: 'Write Single Coil', desc: 'Запись одного бита (Вкл/Выкл)' },
               { code: '06', name: 'Write Single Register', desc: 'Запись одного регистра (16 бит)' },
               { code: '15', name: 'Write Multiple Coils', desc: 'Запись нескольких битов сразу' },
               { code: '16', name: 'Write Multiple Registers', desc: 'Запись блока регистров (очень удобно для настройки)' },
             ].map((fn) => (
               <div key={fn.code} className="flex items-center gap-4 bg-gray-800/40 p-3 rounded border border-gray-800 hover:bg-gray-800 transition-colors">
                  <div className="font-mono font-bold text-accent-400 text-xl w-12 text-center">{fn.code}</div>
                  <div>
                    <div className="font-bold text-gray-200">{fn.name}</div>
                    <div className="text-sm text-gray-500">{fn.desc}</div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )
    },
    {
      id: 'exceptions',
      title: 'Коды Ошибок (Exceptions)',
      icon: <AlertTriangle size={18} />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Если Slave получил запрос корректно (CRC сошелся), но не может его выполнить, он возвращает ошибку.
            В ответе к коду функции прибавляется <b>0x80</b> (например, запрос 03 становится 83 в ответе).
          </p>
          <div className="bg-red-900/10 border border-red-500/20 rounded-xl overflow-hidden">
             <table className="w-full text-left">
               <tbody className="divide-y divide-red-500/10">
                 <tr className="hover:bg-red-500/5">
                   <td className="p-3 font-mono text-red-400 font-bold w-16 text-center">01</td>
                   <td className="p-3">
                     <div className="font-bold text-gray-200">Illegal Function</div>
                     <div className="text-xs text-gray-400">Устройство не поддерживает запрошенную функцию.</div>
                   </td>
                 </tr>
                 <tr className="hover:bg-red-500/5">
                   <td className="p-3 font-mono text-red-400 font-bold w-16 text-center">02</td>
                   <td className="p-3">
                     <div className="font-bold text-gray-200">Illegal Data Address</div>
                     <div className="text-xs text-gray-400">Запрашиваемый адрес регистра не существует в карте памяти устройства.</div>
                   </td>
                 </tr>
                 <tr className="hover:bg-red-500/5">
                   <td className="p-3 font-mono text-red-400 font-bold w-16 text-center">03</td>
                   <td className="p-3">
                     <div className="font-bold text-gray-200">Illegal Data Value</div>
                     <div className="text-xs text-gray-400">Значение, которое вы пытаетесь записать, недопустимо (выход за диапазон).</div>
                   </td>
                 </tr>
                 <tr className="hover:bg-red-500/5">
                   <td className="p-3 font-mono text-red-400 font-bold w-16 text-center">06</td>
                   <td className="p-3">
                     <div className="font-bold text-gray-200">Slave Device Busy</div>
                     <div className="text-xs text-gray-400">Устройство занято внутренней операцией. Попробуйте позже.</div>
                   </td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in relative">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Navigation Sidebar */}
        <aside className="w-full lg:w-72 lg:sticky lg:top-24 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800 p-4 shrink-0">
          <h2 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-4 px-2">Содержание</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id 
                    ? 'bg-accent-600 text-white shadow-lg shadow-accent-600/20 translate-x-1' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                   <span className={activeSection === section.id ? 'text-white' : 'text-gray-500'}>
                     {section.icon}
                   </span>
                   {section.title}
                </div>
                {activeSection === section.id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
          
          <div className="mt-8 pt-6 border-t border-gray-800 px-2">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <Cpu size={16} className="text-emerald-500" /> Полезно знать
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
                Для соединения устройств используйте витую пару с волновым сопротивлением 120 Ом. Экран заземляйте только с одной стороны.
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-12 pb-20">
            {/* Header */}
            <div className="text-left space-y-4 mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                    Modbus <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-purple-500">Wiki</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl">
                    Полный справочник по протоколу для инженеров АСУ ТП и разработчиков.
                </p>
            </div>

            {/* Sections Loop */}
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                 <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-800">
                    <div className="p-2 bg-gray-800 rounded-lg text-accent-500">
                       {section.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                 </div>
                 {section.content}
              </section>
            ))}

            {/* Footer Prompt */}
            <div className="bg-gray-800/20 p-8 rounded-2xl border border-dashed border-gray-700 text-center mt-12">
               <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
               <h3 className="text-xl font-bold text-gray-300 mb-2">Хотите узнать больше?</h3>
               <p className="text-gray-500 mb-6">
                 Используйте "Монитор" и "Конструктор" в приложении, чтобы увидеть эти байты в действии.
               </p>
               <button 
                 onClick={() => window.location.hash = '#/monitor'}
                 className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-gray-600"
               >
                 Перейти к практике
               </button>
            </div>
        </div>

      </div>
    </div>
  );
};