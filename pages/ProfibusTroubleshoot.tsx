import React, { useState } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle2, Search, ArrowRight, Cable } from 'lucide-react';

interface DiagnosticResult {
  title: string;
  probability: 'High' | 'Medium' | 'Low';
  checks: string[];
}

interface Symptom {
  id: string;
  label: string;
  description: string;
}

const SYMPTOMS: Symptom[] = [
  { id: 'bf_solid', label: 'BF (Bus Fault) горит постоянно', description: 'Индикатор горит красным, не мигая.' },
  { id: 'bf_blink', label: 'BF (Bus Fault) мигает', description: 'Индикатор моргает с определенной частотой.' },
  { id: 'dev_missing', label: 'Устройство отсутствует', description: 'CPU не видит станцию вообще.' },
  { id: 'hw_offline', label: 'Offline в HW Config', description: 'В проекте устройство есть, но статус недоступен.' },
  { id: 'sf_on', label: 'SF (System Fault) горит', description: 'Ошибка системы вместе с ошибкой шины.' },
];

export const ProfibusTroubleshoot: React.FC = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getDiagnosis = (): DiagnosticResult[] => {
    const results: DiagnosticResult[] = [];

    if (selectedSymptoms.includes('bf_solid')) {
      results.push({
        title: 'Физический обрыв или КЗ',
        probability: 'High',
        checks: [
          'Проверьте целостность кабеля (нет ли обрыва жил A/B).',
          'Проверьте, включены ли терминаторы ТОЛЬКО на концах сегмента.',
          'Проверьте, подано ли питание на устройство (иногда терминатор активный и питается от устройства).',
          'Убедитесь, что провода A (зеленый) и B (красный) не перепутаны местами.'
        ]
      });
    }

    if (selectedSymptoms.includes('bf_blink')) {
      results.push({
        title: 'Неверная конфигурация или Параметры',
        probability: 'High',
        checks: [
          'Проверьте PROFIBUS адрес (DIP-переключатели на устройстве).',
          'Сравните ID номер GSD файла с реальным устройством.',
          'Проверьте скорость шины (Baud Rate) - совпадает ли у Master и Slave.',
          'Размер модулей ввода/вывода в HW Config не совпадает с реальностью.'
        ]
      });
    }

    if (selectedSymptoms.includes('dev_missing') && !selectedSymptoms.includes('bf_solid')) {
       results.push({
        title: 'Проблемы с адресацией',
        probability: 'Medium',
        checks: [
          'Два устройства имеют одинаковый адрес (Дубликат адреса).',
          'Адрес на DIP-переключателях был изменен после подачи питания (требуется Power Cycle).',
        ]
      });
    }

    if (selectedSymptoms.includes('sf_on') && selectedSymptoms.includes('bf_blink')) {
       results.push({
        title: 'Ошибка параметров модуля',
        probability: 'Medium',
        checks: [
          'Параметризация модуля неверна (недопустимые уставки в GSD).',
          'Watchdog Timeout слишком мал для текущей скорости и помех.'
        ]
      });
    }

    if (results.length === 0 && selectedSymptoms.length > 0) {
        results.push({
            title: 'Общая диагностика',
            probability: 'Low',
            checks: [
                'Проверьте экран кабеля и заземление (токи уравнивания).',
                'Проверьте максимальную длину сегмента для выбранной скорости.'
            ]
        });
    }

    return results;
  };

  const diagnosis = getDiagnosis();

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-12">
       <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
           <Stethoscope className="text-purple-500" size={40} />
           PROFIBUS Troubleshooter
        </h1>
        <p className="text-gray-400">
           Выберите симптомы, которые вы наблюдаете на оборудовании, чтобы получить список возможных причин.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Symptoms Selection */}
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <AlertTriangle className="text-purple-400"/> Симптомы
            </h3>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {SYMPTOMS.map(sym => (
                    <button
                        key={sym.id}
                        onClick={() => toggleSymptom(sym.id)}
                        className={`w-full text-left p-4 border-b border-gray-800 transition-all flex items-start gap-4 hover:bg-gray-800 ${
                            selectedSymptoms.includes(sym.id) ? 'bg-purple-900/20' : ''
                        }`}
                    >
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            selectedSymptoms.includes(sym.id) 
                            ? 'bg-purple-600 border-purple-500 text-white' 
                            : 'border-gray-600'
                        }`}>
                            {selectedSymptoms.includes(sym.id) && <CheckCircle2 size={14}/>}
                        </div>
                        <div>
                            <div className={`font-bold ${selectedSymptoms.includes(sym.id) ? 'text-purple-300' : 'text-gray-300'}`}>
                                {sym.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{sym.description}</div>
                        </div>
                    </button>
                ))}
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 text-sm text-gray-400">
                <p className="flex items-center gap-2 mb-2 font-bold text-gray-300"><Cable size={16}/> Совет:</p>
                Всегда начинайте проверку с физического уровня (кабель, коннекторы, терминаторы). 90% проблем PROFIBUS DP находятся там.
            </div>
        </div>

        {/* Right: Diagnosis Results */}
        <div className="space-y-6">
             <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Search className="text-emerald-400"/> Диагностика
            </h3>
            
            {selectedSymptoms.length === 0 ? (
                <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-xl h-64 flex flex-col items-center justify-center text-gray-600">
                    <Stethoscope size={48} className="mb-4 opacity-50"/>
                    <p>Выберите симптомы слева</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {diagnosis.map((d, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-fade-in shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-bold text-white">{d.title}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    d.probability === 'High' ? 'bg-red-500/20 text-red-400' :
                                    d.probability === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {d.probability} Priority
                                </span>
                            </div>
                            <ul className="space-y-3">
                                {d.checks.map((check, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm text-gray-300 bg-gray-950/50 p-2 rounded">
                                        <ArrowRight size={16} className="text-purple-500 shrink-0 mt-0.5" />
                                        <span>{check}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};