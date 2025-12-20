import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Terminal, Cpu, Lock, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAIConfig } from '../context/AIConfigContext';
import { useNavigate } from 'react-router-dom';
import { createAIProvider } from '../utils/aiProvider';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const SYSTEM_INSTRUCTION = `
Ты — элитный инженер АСУ ТП и эксперт в области энергетики (Senior Industrial Automation Engineer). 
Твоя задача — помогать коллегам с программированием контроллеров (PLC), настройкой терминалов РЗА, протоколами связи и диагностикой.

Твои компетенции:
1. **Протоколы:** Modbus (RTU/TCP), PROFIBUS DP/PA, IEC 61850 (GOOSE, MMS), PROFINET, HART, OPC UA.
2. **Оборудование:** Siemens (S7-300/1200/1500), Schneider Electric, Allen-Bradley, ОВЕН, терминалы релейной защиты (Sepam, SIPROTEC, БМРЗ).
3. **Языки:** IEC 61131-3 (ST, LAD, FBD), C/C++ для встраиваемых систем, Python для скриптов.
4. **Электрика:** Чтение схем, ПУЭ, КИПиА (датчики 4-20мА, термопары).

Правила общения:
- Отвечай кратко, технически грамотно, без "воды".
- Если пишешь код, давай комментарии к важным строкам.
- Если вопрос касается безопасности (высокое напряжение), всегда добавляй предупреждение (Safety First).
- Используй профессиональный сленг (уставки, тэги, регистры, фронты), но будь понятен.
- Если не знаешь ответа или данных мало — так и скажи, предложи варианты диагностики.

Стиль ответов: Markdown.
`;

// Simple Markdown Renderer for code blocks
const ChatMessageContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-sm leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code block
          const codeContent = part.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
          return (
            <div key={index} className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-emerald-300 overflow-x-auto my-2">
              <pre>{codeContent}</pre>
            </div>
          );
        }
        // Text with inline bold
        const inlineParts = part.split(/(\*\*.*?\*\*|`.*?`)/g);
        return (
          <span key={index}>
            {inlineParts.map((subPart, i) => {
              if (subPart.startsWith('**') && subPart.endsWith('**')) {
                return <strong key={i} className="text-white font-bold">{subPart.slice(2, -2)}</strong>;
              }
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                 return <code key={i} className="bg-gray-800 text-purple-300 px-1 rounded font-mono text-xs">{subPart.slice(1, -1)}</code>;
              }
              return subPart;
            })}
          </span>
        );
      })}
    </div>
  );
};

export const AIChat: React.FC = () => {
  const { user } = useAuth();
  const { getApiKey, config, getCurrentModel, isConfigured } = useAIConfig();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      text: 'Приветствую, коллега. Готов помочь с наладкой, кодом или расчетами. Какой протокол сегодня мучаем?', 
      timestamp: new Date() 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isSendingRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current && user) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user || isSendingRef.current) return;

    isSendingRef.current = true;
    const currentInput = input.trim();
    
    try {
      const userMsg: Message = {
        id: `${Date.now()}-user-${Math.random().toString(36).slice(2)}`,
        role: 'user',
        text: currentInput,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      const currentModel = getCurrentModel();
      console.log('[AIChat] Current model:', currentModel);
      console.log('[AIChat] Config:', {
        selectedModel: config.selectedModel,
        isConfigured,
        geminiApiKey: config.geminiApiKey ? `${config.geminiApiKey.substring(0, 8)}...` : 'empty'
      });
      
      if (!currentModel || !isConfigured) {
        throw new Error('AI не настроен. Пожалуйста, настройте API ключи в настройках.');
      }

      const apiKey = getApiKey(currentModel.provider);
      if (!apiKey) {
        throw new Error(`API ключ для ${currentModel.provider} не найден. Проверьте настройки.`);
      }

      console.log('[AIChat] Using provider:', currentModel.provider);
      console.log('[AIChat] Using API key:', `${apiKey.substring(0, 8)}...`);
      console.log('[AIChat] Using model:', config.selectedModel);
      
      // Создаем провайдер для выбранной модели
      const provider = createAIProvider(
        currentModel.provider,
        apiKey,
        config.selectedModel
      );

      // Подготавливаем историю сообщений
      // Исключаем приветственное сообщение (id: 'welcome') и берем только реальную историю
      const conversationMessages = messages.filter(m => m.id !== 'welcome');
      
      // Добавляем текущее сообщение, так как оно еще может не быть в state из-за замыкания,
      // но для провайдера нам нужно отправить всю историю + новый промпт.
      // В текущей реализации мы отправляем историю ИЗ STATE. 
      // State messages (prev) обновили, но в этой замыкании 'messages' еще старый.
      // Поэтому нужно собрать историю вручную: [...messages, userMsg].
      
      const sessionMessages = [...conversationMessages, userMsg];

      const aiMessages = sessionMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

      console.log('[AIChat] Messages to send:', {
        total: aiMessages.length,
        lastMessageRole: aiMessages[aiMessages.length - 1]?.role,
        lastMessagePreview: aiMessages[aiMessages.length - 1]?.content?.substring(0, 50),
      });

      // Отправляем сообщение через провайдер
      const result = provider.sendMessage(aiMessages, SYSTEM_INSTRUCTION);
      
      let fullResponse = "";
      const botMsgId = `${Date.now()}-bot-${Math.random().toString(36).slice(2)}`;
      
      // Initial bot message placeholder
      setMessages(prev => [...prev, {
          id: botMsgId,
          role: 'model',
          text: '',
          timestamp: new Date()
      }]);

      for await (const chunk of result) {
        if (chunk) {
            fullResponse += chunk;
            setMessages(prev => prev.map(m => 
                m.id === botMsgId ? { ...m, text: fullResponse } : m
            ));
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: `${Date.now()}-error-${Math.random().toString(36).slice(2)}`,
        role: 'model',
        text: '⚠ Ошибка связи с сервером AI. Проверьте API Key или соединение.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] w-16 h-16 flex items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-110 group animate-fade-in"
        >
          {/* Lock Badge if not logged in */}
          {!user && (
            <div className="absolute -top-1 -right-1 bg-gray-900 rounded-full p-1 border border-gray-700 z-10">
              <Lock size={12} className="text-gray-400" />
            </div>
          )}
          {user && <Sparkles className="absolute -top-1 -right-1 text-yellow-300 animate-pulse" size={16} fill="currentColor" />}
          
          <Bot size={28} />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-700 pointer-events-none">
            {user ? 'AI Инженер' : 'Войдите для AI'}
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in ring-1 ring-emerald-500/30">
          
          {/* Header */}
          <div className="bg-gray-800/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${user ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-700'}`}>
                {user ? <Cpu className="text-white" size={20} /> : <Lock className="text-gray-400" size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">AI Инженер</h3>
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${user ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{user ? 'Online' : 'Access Restricted'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {user ? (
            /* Logged In State - Full Chat Interface */
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/95 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
                        <Bot size={16} className="text-emerald-400" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <ChatMessageContent content={msg.text} />
                      <div className={`text-[9px] mt-1 text-right opacity-50 font-mono`}>
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>

                    {msg.role === 'user' && (
                       <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-500/30">
                         <User size={16} className="text-indigo-300" />
                       </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                   <div className="flex gap-3 justify-start">
                       <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
                          <Bot size={16} className="text-emerald-400" />
                       </div>
                       <div className="bg-gray-800 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-emerald-500" />
                          <span className="text-xs text-gray-500 animate-pulse">Анализирую...</span>
                       </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Спроси про Modbus, код ST или схему..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none scrollbar-hide"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 bottom-2 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-700 transition-all"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="text-[10px] text-center text-gray-600 mt-2 flex items-center justify-center gap-2">
                   <Terminal size={10}/> {getCurrentModel()?.name || 'AI Model'}
                   <button
                     onClick={() => navigate('/ai-settings')}
                     className="text-purple-400 hover:text-purple-300 transition-colors"
                     title="Настройки AI"
                   >
                     <Settings size={10} />
                   </button>
                </div>
              </div>
            </>
          ) : (
            /* Logged Out State - Access Denied */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900/95">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 mb-6 relative">
                     <div className="absolute inset-0 bg-red-500/5 rounded-full animate-pulse"></div>
                     <Lock size={32} className="text-gray-400" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">Доступ ограничен</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    AI Ассистент доступен только зарегистрированным инженерам. <br/>
                    Войдите в аккаунт, чтобы получить помощь экспертной системы.
                </p>

                <div className="w-full space-y-3">
                    <button 
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/login');
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                        <User size={18} />
                        Войти в аккаунт
                    </button>
                    
                    <button 
                         onClick={() => {
                            setIsOpen(false);
                            navigate('/register');
                        }}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 px-6 py-3 rounded-xl font-medium transition-colors border border-gray-700"
                    >
                        Регистрация
                    </button>
                </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};