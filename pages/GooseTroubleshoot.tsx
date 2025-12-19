import React, { useState } from 'react';
import { Stethoscope, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Solution {
    cause: string;
    check: string[];
}

interface Symptom {
    id: string;
    text: string;
    solutions: Solution[];
}

const symptoms: Symptom[] = [
    {
        id: 'no-traffic',
        text: 'Трафик GOOSE не виден в сети (Wireshark пуст)',
        solutions: [
            {
                cause: 'Неверное подключение или настройки свитча',
                check: [
                    'Убедитесь, что Port Mirroring настроен на порт, куда подключен ноутбук.',
                    'Если используются VLAN, убедитесь, что порт свитча в режиме Trunk или пропускает нужный Tag.'
                ]
            },
            {
                cause: 'Устройство не опубликовало GOOSE',
                check: [
                    'Проверьте, что в IED (терминале) активирован GCB (Goose Control Block).',
                    'Проверьте статус "Simulated" или "Test mode" в устройстве.'
                ]
            }
        ]
    },
    {
        id: 'visible-no-sub',
        text: 'GOOSE виден, но подписка не работает (сигнал не приходит)',
        solutions: [
            {
                cause: 'Mismatched Configuration (ConfRev)',
                check: [
                    'Сравните ConfRev в пакете (Wireshark) и в настройках подписчика.',
                    'Если dataset менялся, ConfRev должен вырасти. Обновите файл CID в подписчике.'
                ]
            },
            {
                cause: 'Разные Dataset',
                check: [
                    'Порядок типов данных (DA Type) должен идеально совпадать.',
                    'Проверьте структуру: BOOL, BIT STRING, INT32 и т.д.'
                ]
            },
            {
                cause: 'Фильтрация по APPID',
                check: [
                    'Проверьте APPID в пакете и в настройках приема.',
                    'Некоторые вендоры требуют точного совпадения (включая регистр букв в некоторых редких багах).'
                ]
            }
        ]
    },
    {
        id: 'unstable',
        text: 'Сигнал "мерцает" или переходит в качество Invalid',
        solutions: [
            {
                cause: 'Time-to-Live (TTL) Timeout',
                check: [
                    'Пакеты приходят реже, чем ожидает подписчик (обычно 2 * MaxTime).',
                    'Проверьте загрузку сети, нет ли потерь пакетов.'
                ]
            },
            {
                cause: 'Дубликаты MAC адресов',
                check: [
                    'Два устройства используют один и тот же MAC источника GOOSE.',
                    'Проверьте stNum/sqNum в Wireshark — если они "прыгают" туда-сюда, это конфликт источников.'
                ]
            }
        ]
    }
];

export const GooseTroubleshoot: React.FC = () => {
    const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
             <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <Stethoscope className="text-emerald-500" size={40} />
                   Troubleshooter
                </h1>
                <p className="text-gray-400">
                    Выберите симптом, чтобы найти причину сбоя.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Symptom List */}
                <div className="space-y-4">
                    {symptoms.map(sym => (
                        <button
                            key={sym.id}
                            onClick={() => setSelectedSymptom(sym.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                                selectedSymptom === sym.id 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                                : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            <div className="relative z-10 font-medium pr-6">{sym.text}</div>
                            {selectedSymptom === sym.id && <div className="absolute right-4 top-1/2 -translate-y-1/2"><ArrowRight size={20}/></div>}
                        </button>
                    ))}
                </div>

                {/* Solutions Area */}
                <div className="md:col-span-2">
                    {selectedSymptom ? (
                        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500"/> Возможные причины
                            </h3>
                            <div className="space-y-6">
                                {symptoms.find(s => s.id === selectedSymptom)?.solutions.map((sol, i) => (
                                    <div key={i} className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                                        <h4 className="font-bold text-emerald-400 mb-2">{sol.cause}</h4>
                                        <ul className="space-y-2">
                                            {sol.check.map((item, k) => (
                                                <li key={k} className="flex gap-2 text-sm text-gray-300">
                                                    <CheckCircle2 size={16} className="text-gray-600 mt-0.5 shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/20">
                            <div className="text-center">
                                <Stethoscope size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Выберите проблему слева</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};