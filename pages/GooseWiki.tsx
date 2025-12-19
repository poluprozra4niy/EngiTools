import React, { useState } from 'react';
import { 
  BookOpen, Shield, Wifi, Clock, AlertTriangle, 
  HelpCircle, CheckCircle2, ChevronRight, XCircle, Trophy
} from 'lucide-react';

const QuizSection: React.FC = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

    const questions = [
        {
            question: "Что происходит со значением stNum при изменении данных (например, отключился выключатель)?",
            options: [
                "stNum увеличивается на 1, sqNum сбрасывается в 0",
                "stNum остается прежним, sqNum увеличивается на 1",
                "stNum сбрасывается в 0, sqNum увеличивается на 1",
                "Оба значения увеличиваются на 1"
            ],
            correct: 0
        },
        {
            question: "Какое максимальное время (MaxTime) обычно ставится для Heartbeat (проверки связи) в статичном состоянии?",
            options: [
                "4 мс",
                "1000-2000 мс",
                "10-20 мс",
                "60000 мс"
            ],
            correct: 1
        },
        {
            question: "Какой диапазон MAC-адресов зарезервирован для GOOSE?",
            options: [
                "01-00-5E-xx-xx-xx",
                "FF-FF-FF-FF-FF-FF",
                "01-0C-CD-01-xx-xx",
                "00-00-00-00-00-00"
            ],
            correct: 2
        },
        {
            question: "Приемник перестал видеть GOOSE сообщения. VLAN настроен верно. Что наиболее вероятно?",
            options: [
                "В свитче не настроен IGMP Snooping или Multicast Filtering",
                "Кабель слишком длинный (>100м)",
                "Не совпадает ConfRev или Dataset в подписке",
                "MAC адрес источника изменился"
            ],
            correct: 2
        }
    ];

    const handleAnswer = (idx: number) => {
        setSelectedAnswer(idx);
        if (idx === questions[currentQuestion].correct) {
            setScore(score + 1);
        }
        setTimeout(() => {
            const next = currentQuestion + 1;
            if (next < questions.length) {
                setCurrentQuestion(next);
                setSelectedAnswer(null);
            } else {
                setShowScore(true);
            }
        }, 1200);
    };

    const resetQuiz = () => {
        setScore(0);
        setCurrentQuestion(0);
        setShowScore(false);
        setSelectedAnswer(null);
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mt-8">
            <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                <Trophy size={20}/> Проверь себя
            </h3>
            
            {showScore ? (
                <div className="text-center py-8">
                    <div className="text-4xl font-bold text-white mb-2">{score} / {questions.length}</div>
                    <p className="text-gray-400 mb-6">
                        {score === questions.length ? "Отличный результат! Вы готовы к наладке." : "Есть пробелы, перечитайте вики."}
                    </p>
                    <button onClick={resetQuiz} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-500">
                        Попробовать снова
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
                        <span>Счет: {score}</span>
                    </div>
                    <div className="text-lg text-white font-medium mb-6">
                        {questions[currentQuestion].question}
                    </div>
                    <div className="space-y-3">
                        {questions[currentQuestion].options.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => selectedAnswer === null && handleAnswer(idx)}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${
                                    selectedAnswer === idx 
                                        ? idx === questions[currentQuestion].correct 
                                            ? 'bg-green-500/20 border-green-500 text-white' 
                                            : 'bg-red-500/20 border-red-500 text-white'
                                        : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800'
                                }`}
                                disabled={selectedAnswer !== null}
                            >
                                <div className="flex items-center justify-between">
                                    {opt}
                                    {selectedAnswer === idx && (
                                        idx === questions[currentQuestion].correct 
                                            ? <CheckCircle2 className="text-green-500" /> 
                                            : <XCircle className="text-red-500" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const GooseWiki: React.FC = () => {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        const navbarHeight = 100; // Offset for sticky navbar
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: elementPosition - navbarHeight,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-24 space-y-2 shrink-0 bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Навигация</div>
             
             {[
                 { id: 'intro', label: 'Что такое GOOSE?' },
                 { id: 'params', label: 'Ключевые параметры' },
                 { id: 'mechanism', label: 'Механизм передачи' },
                 { id: 'pitfalls', label: 'Типичные грабли' },
                 { id: 'quiz', label: 'Тест / Quiz', highlight: true },
             ].map(item => (
                 <button 
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`block w-full text-left p-2 rounded transition-colors text-sm font-medium ${
                        item.highlight 
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                 >
                     {item.label}
                 </button>
             ))}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12 pb-24">
            
            <section id="intro" className="scroll-mt-24">
                <h1 className="text-4xl font-extrabold text-white mb-6">GOOSE <span className="text-emerald-500">Практика</span></h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                    <b>GOOSE (Generic Object Oriented Substation Event)</b> — это механизм быстрой передачи событий (status, trip) между устройствами РЗА по сети Ethernet.
                    Главное отличие от Modbus: это <b>Multicast</b> (один кричит — все слушают) и он работает по модели <b>Publisher/Subscriber</b>.
                </p>
            </section>

            <section id="params" className="grid md:grid-cols-2 gap-6 scroll-mt-24">
                 <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Shield size={18}/> Идентификация</h3>
                     <ul className="space-y-3 text-sm text-gray-300">
                         <li><b className="text-white">MAC Destination:</b> Всегда начинается с <code>01-0C-CD-01-xx-xx</code>.</li>
                         <li><b className="text-white">APPID:</b> 4-байтовый ID (hex), фильтр "свой/чужой" на уровне сетевой карты. Пример: <code>0x0001</code>.</li>
                         <li><b className="text-white">gocbRef:</b> Уникальная ссылка на блок управления в устройстве. Если изменится в конфиге — подписка слетит.</li>
                     </ul>
                 </div>
                 <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock size={18}/> Тайминги и Счетчики</h3>
                     <ul className="space-y-3 text-sm text-gray-300">
                         <li><b className="text-white">stNum (Status Number):</b> Увеличивается при <i>изменении</i> значения данных.</li>
                         <li><b className="text-white">sqNum (Sequence Number):</b> Увеличивается при <i>повторной</i> отправке того же состояния (Heartbeat). Сбрасывается в 0 при росте stNum.</li>
                         <li><b className="text-white">MinTime / MaxTime:</b> При событии спам идет часто (MinTime ~2-4ms), в покое редко (MaxTime ~1000ms).</li>
                     </ul>
                 </div>
            </section>

            <section id="mechanism" className="space-y-4 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white">Как это работает "в железе"</h2>
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 relative overflow-hidden">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                         <div className="text-center">
                             <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2 text-white font-bold">IED A</div>
                             <div className="text-xs text-gray-500">Publisher</div>
                         </div>
                         <div className="flex-1 h-2 bg-gray-700 rounded relative">
                             <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 text-xs text-gray-400">Multicast (VLAN)</div>
                             <div className="w-4 h-4 bg-emerald-500 rounded-full absolute top-[-4px] left-0 animate-[ping_2s_linear_infinite]"></div>
                             <div className="w-4 h-4 bg-emerald-500 rounded-full absolute top-[-4px] left-1/4 animate-[ping_2s_linear_infinite_0.5s]"></div>
                             <div className="w-4 h-4 bg-emerald-500 rounded-full absolute top-[-4px] left-3/4 animate-[ping_2s_linear_infinite_1s]"></div>
                         </div>
                         <div className="text-center">
                             <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 text-white font-bold">IED B</div>
                             <div className="text-xs text-gray-500">Subscriber</div>
                         </div>
                     </div>
                </div>
                <p className="text-gray-400">
                    Уровень 2 OSI (Ethernet). IP-адреса <b>не используются</b>. Маршрутизаторы (роутеры) <b>не пропускают</b> GOOSE, только свитчи.
                    Для разделения трафика критически важно использовать <b>VLAN</b> (IEEE 802.1Q) и приоритет (802.1p Priority 4-7).
                </p>
            </section>

            <section id="pitfalls" className="scroll-mt-24">
                 <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> Типичные проблемы</h2>
                 <div className="space-y-4">
                     {[
                         { title: "Несовпадение ConfRev", desc: "Configuration Revision — версия конфига. Если вы изменили состав dataset в передатчике, ConfRev вырос. Приемник ждет старый — связи нет." },
                         { title: "VLAN Filter", desc: "Свитч настроен на отбрасывание нетегированного трафика, а устройство шлет без тега VLAN 0." },
                         { title: "Неверный APPID", desc: "Некоторые терминалы (например, Siemens) жестко фильтруют входящие по APPID. Если в проекте 3001, а летит 0001 — пакет будет проигнорирован." },
                         { title: "Шторм", desc: "Если соединить два порта свитча патч-кордом (петля) без STP, GOOSE-мультикаст положит сеть за секунду." }
                     ].map((item, i) => (
                         <div key={i} className="flex gap-4 items-start bg-gray-900/50 p-4 rounded-lg">
                             <div className="mt-1 min-w-[24px] h-6 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                             <div>
                                 <h4 className="font-bold text-white">{item.title}</h4>
                                 <p className="text-sm text-gray-400">{item.desc}</p>
                             </div>
                         </div>
                     ))}
                 </div>
            </section>

            <section id="quiz" className="scroll-mt-24">
                <QuizSection />
            </section>

        </div>
    </div>
  );
};