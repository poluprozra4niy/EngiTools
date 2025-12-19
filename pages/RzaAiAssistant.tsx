import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Bot, User, Send, Paperclip, Loader2, ZapOff, Sparkles, X, FileText, Image as ImageIcon } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    attachment?: {
        name: string;
        type: string;
    };
}

const SYSTEM_PROMPT = `
Ты — элитный Эксперт по Релейной Защите и Автоматике (РЗА).
Твоя цель: помогать инженерам-наладчикам анализировать аварийные процессы, рассчитывать уставки и разбираться в логике терминалов.

Твои специализации:
1. **Анализ аварий**: Интерпретация осциллограмм, векторных диаграмм и поведения защит (МТЗ, ТО, ДЗ, ДЗТ).
2. **Оборудование**: Глубокое знание терминалов Sepam, SIPROTEC (Siemens), MiCOM, БМРЗ (Механотроника), ЭКРА.
3. **Протоколы**: IEC 61850 (GOOSE, MMS), Modbus.
4. **Стандарты**: ПУЭ, ПТЭЭП, ANSI коды (50/51, 87, 21, 67 и т.д.).

Если пользователь загружает файл:
- **Картинка (Схема)**: Проанализируй принципиальную схему, найди ошибки в цепях отключения или токовых цепях.
- **PDF (Мануал/Проект)**: Найди ответ на вопрос пользователя в документации.
- **Текст (.CFG/Logs)**: Проанализируй конфигурацию COMTRADE или логи терминала.

Стиль общения: Профессиональный, инженерный, краткий. Используй терминологию (КЗ, уставка, выдержка времени, селективность).
Формат ответа: Markdown.
`;

// Markdown Renderer
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return (
        <div className="space-y-2 text-sm leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
                    return (
                        <div key={index} className="bg-black/50 border border-gray-700 rounded-lg p-3 font-mono text-xs text-emerald-300 overflow-x-auto my-2">
                            <pre>{code}</pre>
                        </div>
                    );
                }
                const inlineParts = part.split(/(\*\*.*?\*\*|`.*?`)/g);
                return (
                    <span key={index}>
                        {inlineParts.map((subPart, i) => {
                            if (subPart.startsWith('**') && subPart.endsWith('**')) {
                                return <strong key={i} className="text-white font-bold">{subPart.slice(2, -2)}</strong>;
                            }
                            if (subPart.startsWith('`') && subPart.endsWith('`')) {
                                return <code key={i} className="bg-gray-800 text-purple-300 px-1 rounded font-mono text-xs border border-gray-700">{subPart.slice(1, -1)}</code>;
                            }
                            return subPart;
                        })}
                    </span>
                );
            })}
        </div>
    );
};

export const RzaAiAssistant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: 'Приветствую, коллега. Я готов помочь с расчетом уставок, анализом схем или разбором логики терминала. Загрузите схему или задайте вопрос.',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<{ file: File, base64: string } | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setAttachedFile({ file, base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !attachedFile) || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date(),
            attachment: attachedFile ? { name: attachedFile.file.name, type: attachedFile.file.type } : undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        const currentFile = attachedFile; // Store ref for API call
        setAttachedFile(null); // Clear UI immediately
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Build history only from text parts for simplicity in this context, 
            // or we could include previous images if the API supports multi-turn with images fully.
            // For stability, we'll send the current file + text as a fresh generation with context if needed.
            // But gemini-3-flash supports chat history with images.
            
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }] // Simplified history (text only) to save tokens/complexity
            }));

            const chat = ai.chats.create({
                model: "gemini-3-flash-preview",
                config: { systemInstruction: SYSTEM_PROMPT },
                history: history
            });

            const parts: any[] = [{ text: userMsg.text }];
            if (currentFile) {
                parts.push({
                    inlineData: {
                        mimeType: currentFile.file.type,
                        data: currentFile.base64
                    }
                });
            }

            // FIX: Pass 'parts' directly to message. Do not wrap in { role: 'user', parts: ... }
            const result = await chat.sendMessageStream({ 
                message: parts 
            });

            let fullResponse = "";
            const botMsgId = (Date.now() + 1).toString();
            
            setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: new Date() }]);

            for await (const chunk of result) {
                const text = chunk.text;
                if (text) {
                    fullResponse += text;
                    setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullResponse } : m));
                }
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: '⚠ Произошла ошибка при обращении к AI сервису.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Bot className="text-amber-500" size={32}/> 
                        AI Помощник <span className="text-gray-500">РЗА</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Анализ схем, мануалов и расчет уставок с помощью Gemini 3.0
                    </p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            
                            {/* Avatar Bot */}
                            {msg.role === 'model' && (
                                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                                    <ZapOff size={20} className="text-amber-500"/>
                                </div>
                            )}

                            {/* Bubble */}
                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                                msg.role === 'user' 
                                ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-tr-none' 
                                : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-none'
                            }`}>
                                {msg.attachment && (
                                    <div className="mb-3 flex items-center gap-2 bg-black/20 p-2 rounded-lg text-xs font-medium">
                                        {msg.attachment.type.includes('image') ? <ImageIcon size={14}/> : <FileText size={14}/>}
                                        {msg.attachment.name}
                                    </div>
                                )}
                                <MessageContent content={msg.text} />
                                <div className="text-[10px] opacity-50 text-right mt-2 font-mono">
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>

                            {/* Avatar User */}
                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                                    <User size={20} className="text-gray-400"/>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                                <ZapOff size={20} className="text-amber-500"/>
                            </div>
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-3">
                                <Loader2 size={20} className="animate-spin text-amber-500"/>
                                <span className="text-gray-400 text-sm animate-pulse">Изучаю документацию...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-950 border-t border-gray-800 relative">
                    
                    {/* Attachment Preview */}
                    {attachedFile && (
                        <div className="absolute -top-12 left-4 bg-gray-800 border border-gray-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-fade-in">
                            {attachedFile.file.type.includes('image') ? <ImageIcon size={14} className="text-purple-400"/> : <FileText size={14} className="text-blue-400"/>}
                            <span className="max-w-[150px] truncate">{attachedFile.file.name}</span>
                            <button onClick={() => setAttachedFile(null)} className="hover:text-red-400 ml-1"><X size={14}/></button>
                        </div>
                    )}

                    <div className="relative flex items-end gap-2 bg-gray-900 border border-gray-700 rounded-xl p-2 focus-within:border-amber-500/50 transition-colors">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Прикрепить файл (PDF, PNG, JPG)"
                        >
                            <Paperclip size={20}/>
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,.pdf,.cfg,.txt" 
                            onChange={handleFileSelect}
                        />
                        
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Опишите проблему, вставьте код или загрузите схему..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2 max-h-32 resize-none scrollbar-thin scrollbar-thumb-gray-700"
                            rows={1}
                            style={{ minHeight: '24px' }}
                            onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                        />

                        <button 
                            onClick={handleSend}
                            disabled={(!input.trim() && !attachedFile) || isLoading}
                            className={`p-2 rounded-lg transition-all ${
                                (!input.trim() && !attachedFile) || isLoading 
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                            }`}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
                        </button>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 text-center flex items-center justify-center gap-1">
                        <Sparkles size={10}/> Powered by Gemini 3.0 Pro Vision
                    </div>
                </div>
            </div>
        </div>
    );
};