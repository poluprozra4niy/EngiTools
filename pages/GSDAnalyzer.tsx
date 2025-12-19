import React, { useState } from 'react';
import { FileCode, Upload, FileSearch, Check, AlertTriangle, Layers, Brain, Sparkles, Loader2, Info } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ParsedGSD {
    vendor: string;
    model: string;
    ident: string;
    revision: string;
    hardware: string;
    software: string;
    baudRates: string[];
    modules: string[];
    isGSD: boolean;
}

const EXPERT_SYSTEM_PROMPT = `
You are a PROFIBUS Expert. Your task is to analyze the provided GSD file content and generate a report for a commissioning engineer.

IMPORTANT: The entire output MUST be in RUSSIAN language.

Follow these strict rules for the output:

1. GSD INTERPRETATION
- Explain what device this GSD represents (type, role in system).
- Identify PROFIBUS class (DP-V0 / DP-V1).
- Describe supported baud rates and limitations.
- Explain modular structure (slots, modules, mandatory/optional).
- Interpret UserPrmData and parameter bytes in practical terms if visible.

2. PRACTICAL ENGINEERING EXPLANATION
- Explain everything in clear, human language used on commissioning sites.
- Avoid academic theory unless necessary.
- Prefer short, structured explanations with bullet points.
- Always relate explanations to real PROFIBUS behavior (BF LED, diagnostics, data shift).

3. I/O AND ADDRESSING
- Analyze input/output sizes.
- Warn about Siemens-specific issues (byte alignment, word boundaries) if applicable.
- Explain how data will appear in PLC memory (I/Q mapping).

4. ERROR PREVENTION & TROUBLESHOOTING
- Detect potential problems:
  - configuration mismatch
  - unsupported baud rate
  - wrong module order
  - parameterization faults
- If a problem is detected, explain:
  - what symptom it causes (BF, Offline, diagnostics)
  - how to fix it step by step

5. COMMISSIONING SUPPORT MODE
- Provide a practical checklist:
  - cable type recommendations
  - addressing checks
  - termination reminders
  - CPU/GSD compatibility notes

6. OUTPUT FORMAT RULES
- Use clear sections with emojis as visual anchors:
  🔍 Анализ
  ⚙️ Профиль Устройства
  🧱 Модули и I/O
  ⚠️ Риски / Предупреждения
  🛠 Чек-лист ПНР
- Do NOT invent data that is not present in the GSD.
- If something is unknown, say it clearly.
- Output purely Markdown.
`;

// Simple Markdown Renderer Component to avoid extra dependencies
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: React.ReactNode[] = [];

    const flushList = (keyPrefix: number) => {
        if (listBuffer.length > 0) {
            elements.push(<ul key={`ul-${keyPrefix}`} className="list-disc pl-5 mb-4 text-gray-300 space-y-1">{[...listBuffer]}</ul>);
            listBuffer = [];
        }
    };

    const parseInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            listBuffer.push(<li key={`li-${index}`}>{parseInline(trimmed.substring(2))}</li>);
        } else {
            flushList(index);
            
            if (trimmed.startsWith('### ')) {
                elements.push(<h3 key={index} className="text-lg font-bold text-emerald-400 mt-6 mb-2">{parseInline(trimmed.substring(4))}</h3>);
            } else if (trimmed.startsWith('## ')) {
                elements.push(<h2 key={index} className="text-xl font-bold text-purple-400 mt-8 mb-4 border-b border-gray-700 pb-2">{parseInline(trimmed.substring(3))}</h2>);
            } else if (trimmed.startsWith('# ')) {
                elements.push(<h1 key={index} className="text-2xl font-bold text-white mt-4 mb-4">{parseInline(trimmed.substring(2))}</h1>);
            } else if (trimmed === '') {
                 // skip empty lines or add spacing
            } else {
                elements.push(<p key={index} className="mb-2 text-gray-300 leading-relaxed">{parseInline(trimmed)}</p>);
            }
        }
    });
    flushList(lines.length);

    return <div className="markdown-content">{elements}</div>;
};

export const GSDAnalyzer: React.FC = () => {
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState<'BASIC' | 'AI'>('BASIC');
    const [parsed, setParsed] = useState<ParsedGSD | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Basic Regex Parser
    const parseGSD = (text: string) => {
        const result: ParsedGSD = {
            vendor: '', model: '', ident: '', revision: '', hardware: '', software: '',
            baudRates: [], modules: [], isGSD: false
        };

        const find = (key: string) => {
            const regex = new RegExp(`${key}\\s*=\\s*"([^"]+)"`, 'i');
            const match = text.match(regex);
            return match ? match[1] : '';
        };

        result.vendor = find('Vendor_Name');
        result.model = find('Model_Name');
        result.ident = find('Ident_Number');
        result.revision = find('Revision');
        result.hardware = find('Hardware_Release');
        result.software = find('Software_Release');

        if (!result.ident) {
             const m = text.match(/Ident_Number\s*=\s*([0-9A-Fa-fx]+)/i);
             if (m) result.ident = m[1];
        }

        const bauds = ['9.6', '19.2', '45.45', '93.75', '187.5', '500', '1.5', '3', '6', '12'];
        bauds.forEach(b => {
             if (new RegExp(`${b.replace('.', '\\.')}_supp\\s*=\\s*1`, 'i').test(text) || 
                 new RegExp(`${b}M_supp\\s*=\\s*1`, 'i').test(text)) {
                 result.baudRates.push(b);
             }
        });

        const moduleRegex = /Module\s*=\s*"([^"]+)"/gi;
        let m;
        while ((m = moduleRegex.exec(text)) !== null) {
            if(result.modules.length < 50) result.modules.push(m[1]);
        }

        result.isGSD = !!(result.vendor || result.model);
        setParsed(result);
    };

    // AI Analysis Handler
    const handleAiAnalyze = async () => {
        if (!input.trim()) return;
        
        setActiveTab('AI');
        setIsAnalyzing(true);
        setAiError(null);
        setAiAnalysis('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: EXPERT_SYSTEM_PROMPT },
                            { text: `\n\n--- GSD CONTENT START ---\n${input}\n--- GSD CONTENT END ---` }
                        ]
                    }
                ],
                config: {
                    temperature: 0.4, // Lower temperature for more analytical/factual output
                }
            });

            setAiAnalysis(response.text || "Не удалось получить ответ от модели.");
        } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            setAiError(error.message || "Ошибка соединения с AI сервисом. Проверьте подключение и API ключ.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setInput(text);
                parseGSD(text);
                setAiAnalysis(''); // Reset previous analysis
                setActiveTab('BASIC');
            };
            reader.readAsText(e.target.files[0]);
        }
    };

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-12 h-[calc(100vh-140px)] flex flex-col">
             
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <FileCode className="text-purple-500"/> 
                        GSD Viewer <span className="text-gray-600 text-lg font-normal">& AI Analyzer</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Загрузите .GSD файл для базового парсинга или используйте AI для экспертного анализа.
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-gray-700">
                         <Upload size={18} />
                         Загрузить .GSD
                         <input type="file" className="hidden" accept=".gsd,.gse,.gsg" onChange={handleUpload} />
                     </label>
                 </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                
                {/* Left: Input Editor (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                     <div className="bg-gray-900 border border-gray-800 rounded-xl p-2 flex-1 flex flex-col shadow-lg">
                        <div className="flex justify-between items-center px-2 py-2 border-b border-gray-800 mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Исходный код</span>
                            <span className="text-xs text-gray-600">{input.length} chars</span>
                        </div>
                        <textarea 
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                parseGSD(e.target.value);
                            }}
                            placeholder="Вставьте содержимое GSD файла сюда..."
                            className="flex-1 bg-gray-950 rounded-lg p-3 font-mono text-[10px] leading-relaxed text-gray-300 outline-none resize-none scrollbar-thin scrollbar-thumb-gray-800 border border-transparent focus:border-purple-500/30"
                        />
                     </div>
                     
                     {/* Analyze Button */}
                     <button 
                        onClick={handleAiAnalyze}
                        disabled={!input || isAnalyzing}
                        className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xl ${
                            !input 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : isAnalyzing 
                                ? 'bg-purple-900/50 cursor-wait' 
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20'
                        }`}
                     >
                        {isAnalyzing ? (
                            <><Loader2 className="animate-spin" size={20} /> Анализ...</>
                        ) : (
                            <><Sparkles size={20} /> Экспертный Анализ AI</>
                        )}
                     </button>
                </div>

                {/* Right: Results (8 cols) */}
                <div className="lg:col-span-8 flex flex-col bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-800 bg-gray-950/50">
                        <button 
                            onClick={() => setActiveTab('BASIC')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'BASIC' 
                                ? 'border-purple-500 text-white bg-gray-900' 
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                            }`}
                        >
                            <FileSearch size={16}/> Быстрый Обзор
                        </button>
                        <button 
                            onClick={() => setActiveTab('AI')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'AI' 
                                ? 'border-indigo-500 text-white bg-gray-900' 
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                            }`}
                        >
                            <Brain size={16}/> Экспертный Отчет
                            {aiAnalysis && <Check size={14} className="text-green-500"/>}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800">
                        
                        {/* Tab: BASIC */}
                        {activeTab === 'BASIC' && (
                            !parsed || !parsed.isGSD ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                    <FileSearch size={48} className="mb-4 opacity-50"/>
                                    <p>Вставьте данные или загрузите файл</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                                        <h3 className="text-xl font-bold text-white mb-4">{parsed.model}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase">Vendor</div>
                                                <div className="font-bold text-purple-300">{parsed.vendor}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase">Ident Number</div>
                                                <div className="font-mono bg-gray-950 px-2 py-0.5 rounded inline-block text-emerald-400">{parsed.ident}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase">Rev</div>
                                                <div className="text-gray-300">{parsed.revision || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 text-xs uppercase">SW/HW</div>
                                                <div className="text-gray-300">{parsed.software || '-'}/{parsed.hardware || '-'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                                        <h4 className="text-gray-400 font-bold mb-3 flex items-center gap-2"><Layers size={16}/> Supported Speeds</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {parsed.baudRates.length > 0 ? parsed.baudRates.map(br => (
                                                <span key={br} className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-200">
                                                    {br}
                                                </span>
                                            )) : <span className="text-gray-500 text-sm italic">Auto-detect not found</span>}
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                                        <h4 className="text-gray-400 font-bold mb-3 flex items-center gap-2"><Layers size={16}/> Modules (First 50)</h4>
                                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                                            {parsed.modules.map((mod, i) => (
                                                <div key={i} className="text-xs text-gray-300 border-b border-gray-800/50 py-1 flex items-center gap-2">
                                                    <span className="text-gray-600 font-mono w-6 text-right">{i+1}</span>
                                                    {mod}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Tab: AI ANALYSIS */}
                        {activeTab === 'AI' && (
                            <div className="h-full flex flex-col">
                                {isAnalyzing ? (
                                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Brain size={24} className="text-indigo-400 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold text-white">Анализ GSD структуры...</h3>
                                            <p className="text-sm text-gray-400">AI проверяет совместимость, модули и параметры</p>
                                        </div>
                                    </div>
                                ) : aiError ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                        <AlertTriangle size={48} className="text-red-500 mb-4"/>
                                        <h3 className="text-xl font-bold text-white mb-2">Ошибка анализа</h3>
                                        <p className="text-red-400 max-w-md">{aiError}</p>
                                        <button onClick={handleAiAnalyze} className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm">Попробовать снова</button>
                                    </div>
                                ) : aiAnalysis ? (
                                    <div className="animate-fade-in">
                                        <SimpleMarkdown content={aiAnalysis} />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                                        <Sparkles size={48} className="mb-4 opacity-50"/>
                                        <p className="text-lg font-medium">Готов к анализу</p>
                                        <p className="text-sm">Нажмите кнопку "Экспертный Анализ AI" слева</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};