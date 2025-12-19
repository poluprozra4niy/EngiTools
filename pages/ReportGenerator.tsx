import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Printer, Plus, Trash2, CheckSquare, Square, 
  MapPin, Settings, ShieldCheck, File, X, Edit2, Save, PenTool,
  ChevronLeft, ChevronRight, LayoutTemplate
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// --- Types ---

interface Device {
  id: number;
  name: string;
  type: string;
  ip: string;
  status: 'Pass' | 'Fail' | 'Skip';
}

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  checked: boolean;
}

// --- Templates ---

const TEMPLATES: Record<string, ChecklistItem[]> = {
    'GENERAL': [
        // Power
        { id: 'p1', category: 'Питание', task: 'Проверка уровня напряжения (24V / 220V)', checked: false },
        { id: 'p2', category: 'Питание', task: 'Проверка заземления шкафа и экрана кабелей', checked: false },
        // Network
        { id: 'n1', category: 'Сеть / Ethernet', task: 'Проверка обжима кабелей (T568B)', checked: false },
        { id: 'n2', category: 'Сеть / Ethernet', task: 'Пинг устройств (Packet Loss 0%)', checked: false },
        { id: 'n3', category: 'Сеть / Ethernet', task: 'Проверка настроек VLAN на свитче', checked: false },
        // Modbus
        { id: 'm1', category: 'Modbus RTU', task: 'Наличие терминаторов 120 Ом', checked: false },
        { id: 'm2', category: 'Modbus RTU', task: 'Проверка полярности A/B', checked: false },
        { id: 'm3', category: 'Modbus RTU', task: 'Опрос всех регистров без ошибок CRC', checked: false },
    ],
    'RZA': [
        // Visual
        { id: 'r1', category: '1. Визуальный осмотр', task: 'Проверка монтажа цепей тока и напряжения', checked: false },
        { id: 'r2', category: '1. Визуальный осмотр', task: 'Проверка заземления вторичных обмоток ТТ', checked: false },
        // Insulation
        { id: 'r3', category: '2. Изоляция', task: 'Мегаомметр: Цепи тока (> 20 МОм)', checked: false },
        { id: 'r4', category: '2. Изоляция', task: 'Мегаомметр: Цепи напряжения (> 20 МОм)', checked: false },
        { id: 'r5', category: '2. Изоляция', task: 'Мегаомметр: Цепи опертока (> 10 МОм)', checked: false },
        // Injection
        { id: 'r6', category: '3. Прогрузка (Вторичка)', task: 'Проверка токовых входов (1A/5A)', checked: false },
        { id: 'r7', category: '3. Прогрузка (Вторичка)', task: 'Проверка дискретных входов', checked: false },
        { id: 'r8', category: '3. Прогрузка (Вторичка)', task: 'Измерение времени срабатывания МТЗ', checked: false },
        // Logic
        { id: 'r9', category: '4. Действие на откл.', task: 'Отключение выключателя от защиты', checked: false },
        { id: 'r10', category: '4. Действие на откл.', task: 'Работа сигнализации (Блинкер/Лампа)', checked: false },
    ],
    'FIBER': [
        { id: 'f1', category: 'ВОЛС', task: 'Проверка чистоты коннекторов', checked: false },
        { id: 'f2', category: 'ВОЛС', task: 'Измерение затухания (Reflectometer)', checked: false },
        { id: 'f3', category: 'ВОЛС', task: 'Проверка радиуса изгиба патч-кордов', checked: false },
    ]
};

const DEFAULT_CONCLUSIONS: Record<string, string> = {
    'GENERAL': "Работы по пусконаладке выполнены в полном объеме. Оборудование функционирует в соответствии с техническим заданием. Замечаний к работе системы нет.",
    'RZA': "Устройства релейной защиты проверены и настроены согласно карте уставок. Цепи тока и напряжения исправны. Прохождение команд на отключение выключателя проверено. Защита введена в работу.",
    'FIBER': "Оптическая линия связи соответствует нормам затухания. Качество сигнала достаточное для стабильной передачи данных."
};

export const ReportGenerator: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // --- State ---
  const [activeTemplate, setActiveTemplate] = useState('GENERAL');
  
  const [projectInfo, setProjectInfo] = useState({
    objectName: '',
    engineer: '',
    date: new Date().toISOString().split('T')[0],
    city: ''
  });

  const [conclusion, setConclusion] = useState(DEFAULT_CONCLUSIONS['GENERAL']);

  const [devices, setDevices] = useState<Device[]>([
    { id: 1, name: 'Protection_Relay_01', type: 'Sepam S80', ip: '192.168.0.10', status: 'Pass' }
  ]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(TEMPLATES['GENERAL']);
  
  // Initialize from URL param
  useEffect(() => {
      const type = searchParams.get('template');
      if (type && TEMPLATES[type]) {
          applyTemplate(type);
      }
  }, [searchParams]);

  // Actions
  const applyTemplate = (type: string) => {
      setActiveTemplate(type);
      setChecklist(JSON.parse(JSON.stringify(TEMPLATES[type]))); // Deep copy to avoid mutating constant
      setConclusion(DEFAULT_CONCLUSIONS[type] || DEFAULT_CONCLUSIONS['GENERAL']);
  };

  // Custom Check State
  const [isAddingCheck, setIsAddingCheck] = useState(false);
  const [newCheckTask, setNewCheckTask] = useState('');
  const [newCheckCategory, setNewCheckCategory] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Calculate total pages based on content overflow
  useEffect(() => {
    // Delay slightly to allow render to settle
    const timer = setTimeout(() => {
        if (contentRef.current) {
            const scrollWidth = contentRef.current.scrollWidth;
            const clientWidth = contentRef.current.clientWidth;
            
            // Formula: scrollWidth = N * width + (N-1) * gap
            const pxPerMm = clientWidth / 170; // Calculate px/mm ratio
            const gapPx = 40 * pxPerMm; // Gap in pixels
            const stride = clientWidth + gapPx; // Full stride (Page + Gap)

            if (stride > 0) {
                 const pages = Math.round((scrollWidth + gapPx) / stride);
                 const newTotal = Math.max(1, pages);
                 setTotalPages(newTotal);
                 setCurrentPage(prev => Math.min(prev, newTotal));
            }
        }
    }, 300);
    return () => clearTimeout(timer);
  }, [checklist, devices, conclusion, projectInfo]); 

  // --- Handlers ---
  
  const handlePrint = () => {
    window.print();
  };

  const handleWordExport = () => {
      const element = document.getElementById("print-content-inner");
      if (!element) return;

      // CSS to map Tailwind classes and layout to Word-friendly styles
      const cssStyles = `
        body { font-family: 'Times New Roman', serif; color: black; font-size: 12pt; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
        td, th { border: 1px solid black; padding: 4pt; vertical-align: top; }
        
        /* Headers */
        h1 { font-size: 18pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 5pt; }
        h2 { font-size: 14pt; text-align: center; margin-bottom: 20pt; font-weight: normal; }
        h3 { font-size: 14pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid black; margin-top: 15pt; margin-bottom: 10pt; }
        h4 { font-size: 12pt; font-weight: bold; background-color: #e5e7eb; padding: 2pt; margin-top: 5pt; border-left: 4pt solid black; }

        /* Utility Maps */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        .font-mono { font-family: 'Courier New', monospace; }
        .bg-gray-200 { background-color: #e5e7eb; }
        
        /* Specific Overrides */
        .border-none { border: none !important; }
        .border-b { border-bottom: 1px solid black; }
        .conclusion { white-space: pre-wrap; text-align: justify; line-height: 1.5; }
        
        /* Layout Helpers */
        .break-inside-avoid { page-break-inside: avoid; }
        .flex { display: flex; } 
        .justify-between { justify-content: space-between; }
        
        /* Hide UI icons (checkboxes etc) in Word if they are pure SVG without text fallback, 
           but here we use unicode chars for checkboxes in text, so simple text rendering works. */
      `;

      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Export HTML to Word Document</title>" +
            `<style>${cssStyles}</style>` +
            "</head><body>";
      const footer = "</body></html>";
      
      const clone = element.cloneNode(true) as HTMLElement;
      // Reset layout styles that might interfere with Word
      clone.style.height = 'auto';
      clone.style.width = '100%';
      clone.style.columns = 'auto';
      clone.style.transform = 'none';

      const sourceHTML = header + clone.innerHTML + footer;

      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `Act_${projectInfo.date}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
  };

  const updateDevice = (id: number, field: keyof Device, value: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const addDevice = () => {
    setDevices(prev => [...prev, { 
      id: Date.now(), name: '', type: '', ip: '', status: 'Pass' 
    }]);
  };

  const removeDevice = (id: number) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const removeCheckItem = (id: string) => {
    setChecklist(prev => prev.filter(c => c.id !== id));
    if (editingId === id) {
        setEditingId(null);
    }
  };

  const addCheckItem = () => {
    if (!newCheckTask.trim()) return;
    const category = newCheckCategory.trim() || 'Дополнительно';
    const newItem: ChecklistItem = {
        id: `custom_${Date.now()}`,
        category: category,
        task: newCheckTask.trim(),
        checked: false
    };
    setChecklist(prev => [...prev, newItem]);
    setNewCheckTask('');
    setIsAddingCheck(false);
  };

  // Editing Handlers
  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditTask(item.task);
    setEditCategory(item.category);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
    setEditCategory('');
  };

  const handleSaveEdit = () => {
      if (!editTask.trim() || !editingId) return;
      
      setChecklist(prev => prev.map(item => 
          item.id === editingId 
              ? { ...item, task: editTask.trim(), category: editCategory.trim() || 'Дополнительно' }
              : item
      ));
      
      handleCancelEdit();
  };

  const changePage = (delta: number) => {
      setCurrentPage(prev => Math.max(1, Math.min(totalPages, prev + delta)));
  };


  // Group checklist for display
  const checklistGroups = checklist.reduce<Record<string, ChecklistItem[]>>((groups, item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {});

  // Get unique categories for autocomplete
  const existingCategories = Array.from(new Set(checklist.map(c => c.category)));

  return (
    <div className="animate-fade-in pb-12 h-screen flex flex-col overflow-hidden">
      
      {/* HEADER (No Print) */}
      <div className="text-center space-y-4 mb-6 no-print shrink-0">
        <h1 className="text-3xl font-extrabold text-white flex items-center justify-center gap-3">
           <FileText className="text-blue-500" size={32} />
           Генератор Отчетов ПНР
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* === LEFT: CONFIGURATION FORM (No Print) === */}
        <div className="w-full lg:w-[400px] space-y-4 no-print overflow-y-auto pb-20 pr-2 scrollbar-thin scrollbar-thumb-gray-800">
          
          {/* Template Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg flex items-center gap-4">
              <LayoutTemplate size={20} className="text-purple-400"/>
              <select 
                value={activeTemplate} 
                onChange={e => applyTemplate(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-purple-500"
              >
                  <option value="GENERAL">Общий шаблон</option>
                  <option value="RZA">Релейная Защита (РЗА)</option>
                  <option value="FIBER">Оптика / ВОЛС</option>
              </select>
          </div>

          {/* 1. Project Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
             <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><MapPin size={16} className="text-blue-400"/> Информация об объекте</h3>
             <div className="space-y-3">
                <div>
                   <label className="text-[10px] text-gray-500 uppercase font-bold">Объект</label>
                   <input 
                      value={projectInfo.objectName} 
                      onChange={e => setProjectInfo({...projectInfo, objectName: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors" 
                      placeholder="ПС 110кВ Северная"
                   />
                </div>
                <div>
                   <label className="text-[10px] text-gray-500 uppercase font-bold">Город</label>
                   <input 
                      value={projectInfo.city} 
                      onChange={e => setProjectInfo({...projectInfo, city: e.target.value})}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors" 
                      placeholder="Москва"
                   />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className="text-[10px] text-gray-500 uppercase font-bold">Инженер</label>
                       <input 
                          value={projectInfo.engineer} 
                          onChange={e => setProjectInfo({...projectInfo, engineer: e.target.value})}
                          className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors" 
                          placeholder="Иванов И.И."
                       />
                   </div>
                   <div>
                       <label className="text-[10px] text-gray-500 uppercase font-bold">Дата</label>
                       <input 
                          type="date"
                          value={projectInfo.date} 
                          onChange={e => setProjectInfo({...projectInfo, date: e.target.value})}
                          className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors" 
                       />
                   </div>
                </div>
             </div>
          </div>

          {/* 2. Devices */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm"><Settings size={16} className="text-emerald-400"/> Устройства</h3>
                <button onClick={addDevice} className="bg-gray-800 hover:bg-gray-700 p-1.5 rounded text-white transition-colors"><Plus size={14}/></button>
             </div>
             <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                {devices.map(dev => (
                    <div key={dev.id} className="bg-gray-950 p-2 rounded border border-gray-800 text-sm group relative">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <input value={dev.name} onChange={e => updateDevice(dev.id, 'name', e.target.value)} placeholder="Name" className="bg-transparent border-b border-gray-700 text-white outline-none focus:border-emerald-500 text-xs py-1"/>
                             <input value={dev.type} onChange={e => updateDevice(dev.id, 'type', e.target.value)} placeholder="Type" className="bg-transparent border-b border-gray-700 text-gray-400 outline-none focus:border-emerald-500 text-xs py-1"/>
                        </div>
                        <div className="flex justify-between items-center">
                             <input value={dev.ip} onChange={e => updateDevice(dev.id, 'ip', e.target.value)} placeholder="IP/ID" className="bg-transparent border-b border-gray-700 text-blue-400 w-24 outline-none font-mono text-xs"/>
                             <select 
                                value={dev.status} 
                                onChange={e => updateDevice(dev.id, 'status', e.target.value as any)}
                                className={`bg-gray-900 text-[10px] rounded px-1 border border-gray-700 outline-none ${
                                    dev.status === 'Pass' ? 'text-green-400' : dev.status === 'Fail' ? 'text-red-400' : 'text-gray-500'
                                }`}
                             >
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                                <option value="Skip">Skip</option>
                             </select>
                        </div>
                        <button onClick={() => removeDevice(dev.id)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
             </div>
          </div>

          {/* 3. Checklist Toggles */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
             <div className="flex justify-between items-center mb-3">
                 <h3 className="text-white font-bold flex items-center gap-2 text-sm"><ShieldCheck size={16} className="text-amber-400"/> Проверки</h3>
                 <button 
                    onClick={() => setIsAddingCheck(!isAddingCheck)} 
                    className={`p-1.5 rounded transition-colors ${isAddingCheck ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
                 >
                    {isAddingCheck ? <X size={14}/> : <Plus size={14}/>}
                 </button>
             </div>

             {/* Add New Check Form */}
             {isAddingCheck && (
                 <div className="mb-4 bg-gray-950 p-3 rounded border border-gray-700 animate-fade-in">
                     <div className="text-[10px] text-gray-500 mb-2 uppercase font-bold">Новая проверка</div>
                     
                     <div className="space-y-2 mb-3">
                         <input 
                            list="categories" 
                            value={newCheckCategory}
                            onChange={(e) => setNewCheckCategory(e.target.value)}
                            placeholder="Категория"
                            className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                         />
                         <datalist id="categories">
                             {existingCategories.map(c => <option key={c} value={c} />)}
                         </datalist>

                         <input 
                            value={newCheckTask}
                            onChange={(e) => setNewCheckTask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
                            placeholder="Описание задачи"
                            className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                         />
                     </div>
                     <button 
                        onClick={addCheckItem}
                        disabled={!newCheckTask.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-colors"
                     >
                        Добавить
                     </button>
                 </div>
             )}

             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                 {(Object.entries(checklistGroups) as [string, ChecklistItem[]][]).map(([cat, items]) => (
                     <div key={cat}>
                         <div className="text-[10px] font-bold text-gray-500 uppercase mb-1 sticky top-0 bg-gray-900 py-1 z-10">{cat}</div>
                         <div className="space-y-1">
                             {items.map(item => (
                                 <div key={item.id} className="group relative">
                                     {editingId === item.id ? (
                                         // Edit Mode
                                         <div className="bg-gray-800 p-2 rounded border border-gray-600 space-y-2 animate-fade-in">
                                             <input 
                                                list="edit-categories" 
                                                value={editCategory}
                                                onChange={(e) => setEditCategory(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                                                placeholder="Категория"
                                             />
                                             <datalist id="edit-categories">
                                                {existingCategories.map(c => <option key={c} value={c} />)}
                                             </datalist>
                                             <input 
                                                value={editTask}
                                                onChange={(e) => setEditTask(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                                                placeholder="Задача"
                                                autoFocus
                                             />
                                             <div className="flex gap-2 justify-end">
                                                 <button onClick={handleCancelEdit} className="text-gray-400 hover:text-white p-1" title="Отмена">
                                                     <X size={14} />
                                                 </button>
                                                 <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-400 p-1" title="Сохранить">
                                                     <Save size={14} />
                                                 </button>
                                             </div>
                                         </div>
                                     ) : (
                                         // Display Mode
                                         <div className="flex items-center gap-2 hover:bg-gray-800 p-1 rounded transition-colors">
                                             <button 
                                                onClick={() => toggleCheck(item.id)}
                                                className="flex-grow flex items-start gap-2 text-left"
                                             >
                                                <div className={`mt-0.5 ${item.checked ? 'text-green-500' : 'text-gray-600'}`}>
                                                    {item.checked ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                </div>
                                                <span className={`text-xs ${item.checked ? 'text-gray-300' : 'text-gray-500'}`}>{item.task}</span>
                                             </button>
                                             
                                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button 
                                                    onClick={() => handleStartEdit(item)}
                                                    className="text-gray-600 hover:text-blue-400 p-1"
                                                    title="Редактировать"
                                                 >
                                                    <Edit2 size={12} />
                                                 </button>
                                                 <button 
                                                    onClick={() => removeCheckItem(item.id)}
                                                    className="text-gray-600 hover:text-red-500 p-1"
                                                    title="Удалить"
                                                 >
                                                    <Trash2 size={12} />
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 ))}
             </div>
          </div>

          {/* 4. Conclusion Edit */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
             <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><PenTool size={16} className="text-purple-400"/> Заключение</h3>
             <textarea 
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full h-24 bg-gray-950 border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500 resize-none"
                placeholder="Введите текст заключения..."
             />
          </div>

        </div>

        {/* === RIGHT: A4 PREVIEW (Print Only styles apply here) === */}
        <div className="flex-1 bg-gray-800/30 rounded-2xl border border-gray-800/50 overflow-hidden flex flex-col no-print">
             
             {/* Toolbar */}
             <div className="p-4 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center flex-wrap gap-4">
                 <div className="flex items-center gap-4">
                    <h2 className="text-gray-300 font-bold text-sm flex items-center gap-2">
                        <File size={16} className="text-gray-500" />
                        Предпросмотр
                    </h2>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-2 border border-gray-700">
                        <button 
                            onClick={() => changePage(-1)} 
                            disabled={currentPage <= 1}
                            className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1 text-xs font-mono">
                            <input 
                                type="number" 
                                min="1" 
                                max={totalPages}
                                value={currentPage} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setCurrentPage(Math.min(Math.max(1, val), totalPages));
                                }}
                                className="w-8 bg-gray-900 border border-gray-700 rounded text-center text-white outline-none focus:border-blue-500"
                            />
                            <span className="text-gray-500">/ {totalPages}</span>
                        </div>
                        <button 
                            onClick={() => changePage(1)} 
                            disabled={currentPage >= totalPages}
                            className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                 </div>

                 <div className="flex gap-2">
                     <button 
                        type="button"
                        onClick={handleWordExport}
                        className="flex items-center gap-2 bg-blue-900/50 hover:bg-blue-800 text-blue-100 px-3 py-1.5 rounded-lg font-medium transition-all text-xs border border-blue-700"
                     >
                         <File size={14} /> DOC
                     </button>
                     <button 
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-lg shadow-blue-600/20 transition-all text-xs"
                     >
                         <Printer size={14} /> Печать / PDF
                     </button>
                 </div>
             </div>

             {/* Scrollable Preview Area */}
             <div className="flex-1 overflow-auto p-8 bg-gray-800/50 scrollbar-thin scrollbar-thumb-gray-700 flex justify-center">
                 {/* VISUAL PAPER REPRESENTATION - Viewport */}
                 <div className="w-[210mm] h-[297mm] bg-white shadow-2xl relative overflow-hidden transition-all duration-300">
                      
                      {/* Sliding Container that holds the columns */}
                      <div 
                         id="print-content"
                         className="print-reset" // Class to reset styles for print
                         style={{
                             padding: '20mm',
                             height: '100%',
                             boxSizing: 'border-box'
                         }}
                      >
                          <div
                            ref={contentRef}
                            id="print-content-inner"
                            style={{
                                height: '257mm', // Fixed height for column generation (297 - 40)
                                // Removed fixed width 1000vw to allow natural content width calculation for pagination
                                columnWidth: '170mm',
                                columnGap: '40mm',
                                columnFill: 'auto',
                                transform: `translateX(calc(-1 * (${currentPage} - 1) * (170mm + 40mm)))`,
                                transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            }}
                          >
                            {/* --- DOCUMENT START --- */}
                            
                            {/* HEADER */}
                            <div className="text-center mb-8 border-b-2 border-black pb-4 break-inside-avoid" style={{ width: '170mm' }}>
                                <h1 className="text-2xl font-bold uppercase mb-2 text-black">Акт проведения пусконаладочных работ</h1>
                                <h2 className="text-lg text-black">{activeTemplate === 'RZA' ? 'Релейная защита и Автоматика' : activeTemplate === 'FIBER' ? 'Волоконно-оптические линии связи' : 'АСУ ТП / Телемеханика'}</h2>
                            </div>

                            {/* INFO TABLE */}
                            <div className="mb-8 break-inside-avoid" style={{ width: '170mm' }}>
                                <table className="w-full text-sm border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="font-bold py-1 w-40 text-black border-none">Объект:</td>
                                            <td className="border-b border-black py-1 text-black">{projectInfo.objectName || '________________________'}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1 text-black border-none">Город:</td>
                                            <td className="border-b border-black py-1 text-black">{projectInfo.city || '________________________'}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1 text-black border-none">Дата проведения:</td>
                                            <td className="border-b border-black py-1 text-black">{projectInfo.date}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1 text-black border-none">Инженер:</td>
                                            <td className="border-b border-black py-1 text-black">{projectInfo.engineer || '________________________'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 1. DEVICE LIST */}
                            <div className="mb-8 break-inside-avoid" style={{ width: '170mm' }}>
                                <h3 className="font-bold text-lg mb-3 uppercase border-b border-gray-300 text-black">1. Перечень оборудования</h3>
                                <table className="w-full text-sm border border-black border-collapse">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="border border-black p-2 text-left text-black">Наименование</th>
                                            <th className="border border-black p-2 text-left text-black">Тип</th>
                                            <th className="border border-black p-2 text-center w-32 text-black">Адрес (IP/ID)</th>
                                            <th className="border border-black p-2 text-center w-24 text-black">Статус</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {devices.length === 0 ? (
                                            <tr><td colSpan={4} className="border border-black p-4 text-center italic text-black">Устройства не добавлены</td></tr>
                                        ) : (
                                            devices.map(dev => (
                                                <tr key={dev.id}>
                                                    <td className="border border-black p-2 text-black">{dev.name || '-'}</td>
                                                    <td className="border border-black p-2 text-black">{dev.type || '-'}</td>
                                                    <td className="border border-black p-2 text-center font-mono text-black">{dev.ip || '-'}</td>
                                                    <td className="border border-black p-2 text-center text-black">
                                                        {dev.status === 'Pass' && <span className="font-bold text-black">OK</span>}
                                                        {dev.status === 'Fail' && <span className="font-bold text-black">FAIL</span>}
                                                        {dev.status === 'Skip' && <span className="text-black">-</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. CHECKLIST */}
                            <div className="mb-8 break-after-avoid" style={{ width: '170mm' }}>
                                <h3 className="font-bold text-lg mb-3 uppercase border-b border-gray-300 text-black">2. Протокол проверки (Checklist)</h3>
                                <div className="space-y-4">
                                    {(Object.entries(checklistGroups) as [string, ChecklistItem[]][]).map(([cat, items]) => (
                                        <div key={cat} className="break-inside-avoid">
                                            <h4 className="font-bold text-sm bg-gray-200 p-1 mb-1 border-l-4 border-black pl-2 text-black">{cat}</h4>
                                            <table className="w-full text-sm border-collapse">
                                                <tbody>
                                                    {items.map(item => (
                                                        <tr key={item.id} className="border-b border-gray-300">
                                                            <td className="py-1 w-6 text-center border-r border-gray-300 text-black">
                                                                {item.checked ? <span className="font-bold">☑</span> : <span>☐</span>}
                                                            </td>
                                                            <td className="py-1 pl-2 text-black">{item.task}</td>
                                                            <td className="py-1 w-24 text-right italic text-black">
                                                                {item.checked ? 'Норма' : '___'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. CONCLUSION */}
                            <div className="mt-8 break-inside-avoid" style={{ width: '170mm' }}>
                                <h3 className="font-bold text-lg mb-4 uppercase border-b border-gray-300 text-black">3. Заключение</h3>
                                <p className="text-sm text-justify mb-8 leading-relaxed text-black whitespace-pre-wrap conclusion">
                                    {conclusion}
                                </p>

                                <div className="flex justify-between mt-12">
                                    <div className="text-sm text-black">
                                        <div className="mb-8 text-black">Сдал (Инженер):</div>
                                        <div className="border-b border-black w-48 mb-1"></div>
                                        <div className="text-xs text-black">Подпись / Расшифровка</div>
                                    </div>
                                    <div className="text-sm text-black">
                                        <div className="mb-8 text-black">Принял (Заказчик):</div>
                                        <div className="border-b border-black w-48 mb-1"></div>
                                        <div className="text-xs text-black">Подпись / Расшифровка</div>
                                    </div>
                                </div>
                            </div>

                          </div>
                      </div>
                      
                      {/* FOOTER */}
                      <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-gray-500 no-print z-10 pointer-events-none">
                           Page {currentPage} of {totalPages}
                      </div>

                 </div>
             </div>
        </div>

        {/* Global Print Styles Override */}
        <style>{`
          @media print {
            .print-reset {
                height: auto !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            #print-content-inner {
                height: auto !important;
                width: 100% !important;
                column-width: auto !important;
                column-gap: normal !important;
                transform: none !important;
                display: block !important;
            }
            /* Ensure widths are full for print */
            #print-content-inner > div {
                width: 100% !important;
            }
          }
        `}</style>

      </div>
    </div>
  );
};