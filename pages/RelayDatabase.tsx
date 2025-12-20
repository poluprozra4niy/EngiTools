import React, { useState, useEffect } from 'react';
import {
    HardDrive, Search, Cable, Book, Grid, Shield, Copy, Check, Info,
    Edit3, Save, X, Plus, Trash2, Sparkles, Loader2, FileText, Upload,
    Cpu, Radio, Gauge, Zap, Activity, Server, Wrench, FileCheck,
    Camera, ChevronDown, ChevronUp, Image as ImageIcon, Link as LinkIcon, ExternalLink,
    Users, Phone, Mail, Cloud, CloudOff, RefreshCw, Globe, AlertTriangle
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from '../lib/supabase'; // Import Supabase & Check
import { useAuth } from '../context/AuthContext';
import { useAIConfig } from '../context/AIConfigContext';

// --- Types ---

type DeviceCategory = 'TERMINAL' | 'PLC' | 'IO_MOD' | 'SENSOR' | 'VFD' | 'METER' | 'MODEM';

interface CategoryConfig {
    id: DeviceCategory;
    label: string;
    icon: React.ReactNode;
    color: string;
    specFields: { key: string; label: string; placeholder: string }[];
}

interface Register {
    addr: string;
    name: string;
    type: string;
    bit: string;
    desc: string;
}

interface GuideStep {
    id: string;
    title: string;
    description: string;
    image?: string; // Base64
}

interface ResourceLink {
    title: string;
    url: string;
}

interface Contact {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
}

interface DeviceModel {
    id: string;
    db_id?: string; // Real Supabase ID
    category: DeviceCategory;
    vendor: string;
    model: string;
    series: string;
    description: string;
    image?: string;
    specs: Record<string, string>;
    guide: GuideStep[];
    resources: ResourceLink[];
    contacts: Contact[];
    protocols: string[];
    registers: Register[];
    terminals: { name: string, pins: string[], desc: string, type: string }[];
    is_public?: boolean; // Flag for shared vs private
}

// --- Constants & Config ---

const CATEGORIES: CategoryConfig[] = [
    {
        id: 'TERMINAL', label: 'Терминалы РЗА', icon: <Shield size={20} />, color: 'text-emerald-400',
        specFields: [
            { key: 'ansi', label: 'ANSI Codes', placeholder: '50/51, 87T...' },
            { key: 'ct_rating', label: 'Nominal CT', placeholder: '1A / 5A' },
            { key: 'supply', label: 'Power Supply', placeholder: '24-250 VDC' }
        ]
    },
    {
        id: 'PLC', label: 'Контроллеры (PLC)', icon: <Cpu size={20} />, color: 'text-blue-400',
        specFields: [
            { key: 'cpu_speed', label: 'Cycle Time', placeholder: 'ns/op' },
            { key: 'memory', label: 'Work Memory', placeholder: '100 KB' },
            { key: 'languages', label: 'IEC 61131-3', placeholder: 'LAD, FBD, SCL' }
        ]
    },
    {
        id: 'IO_MOD', label: 'Модули Ввода/Вывода', icon: <Server size={20} />, color: 'text-indigo-400',
        specFields: [
            { key: 'di_count', label: 'Digital Inputs', placeholder: '8 x 24VDC' },
            { key: 'do_count', label: 'Digital Outputs', placeholder: '4 x Relay' },
            { key: 'ai_count', label: 'Analog Inputs', placeholder: '2 x 4-20mA' },
            { key: 'ao_count', label: 'Analog Outputs', placeholder: '0' }
        ]
    },
    {
        id: 'SENSOR', label: 'Датчики (КИП)', icon: <Gauge size={20} />, color: 'text-cyan-400',
        specFields: [
            { key: 'measure', label: 'Measurement', placeholder: 'Pressure / Temp' },
            { key: 'range', label: 'Range', placeholder: '0...10 Bar' },
            { key: 'output', label: 'Output Signal', placeholder: '4-20 mA (2-wire)' },
            { key: 'accuracy', label: 'Accuracy', placeholder: '0.5%' }
        ]
    },
    {
        id: 'VFD', label: 'Частотники (ПЧ)', icon: <Activity size={20} />, color: 'text-amber-400',
        specFields: [
            { key: 'power', label: 'Power (kW)', placeholder: '5.5 kW' },
            { key: 'voltage', label: 'Input Voltage', placeholder: '3x400V' },
            { key: 'current', label: 'Rated Current', placeholder: '12 A' }
        ]
    },
    {
        id: 'METER', label: 'Счетчики Э/Э', icon: <Zap size={20} />, color: 'text-yellow-400',
        specFields: [
            { key: 'class', label: 'Accuracy Class', placeholder: '0.5S' },
            { key: 'rating', label: 'Current Rating', placeholder: '5(10) A' },
            { key: 'tariffs', label: 'Tariffs', placeholder: '4' }
        ]
    },
    {
        id: 'MODEM', label: 'Связь / Модемы', icon: <Radio size={20} />, color: 'text-purple-400',
        specFields: [
            { key: 'bands', label: 'Bands', placeholder: 'LTE B3/B7/B20' },
            { key: 'sims', label: 'SIM Slots', placeholder: '2x Mini-SIM' },
            { key: 'interfaces', label: 'Interfaces', placeholder: 'RS-485, Ethernet' }
        ]
    }
];

// --- Mock Database (Fallback) ---
const INITIAL_DB: DeviceModel[] = [
    {
        id: 'sepam-s80',
        category: 'TERMINAL',
        vendor: 'Schneider Electric',
        model: 'Sepam S80 (Demo)',
        series: 'Series 80',
        description: 'Демонстрационное устройство. Войдите, чтобы создать свои.',
        protocols: ['Modbus RTU', 'IEC 61850'],
        specs: { ansi: '50/51, 50N/51N, 67, 87T', ct_rating: '1A / 5A', supply: '24-250 VDC' },
        guide: [],
        resources: [],
        contacts: [],
        terminals: [],
        registers: [],
        is_public: true
    }
];

// --- AI Prompts ---
const AI_DEVICE_PROMPT = `
Analyze the provided PDF document (Industrial Device Manual). 
1. Identify the device category (TERMINAL, PLC, SENSOR, VFD, METER, MODEM, IO_MOD).
2. Extract specs relevant to that category.
3. Extract a step-by-step commissioning/setup guide in RUSSIAN language.
4. Extract terminals and registers if available.
5. Extract links to documentation or software.

Return JSON:
{
  "category": "String (Enum)",
  "vendor": "String",
  "model": "String",
  "series": "String",
  "description": "String (Summary in Russian)",
  "protocols": ["String"],
  "specs": { "key": "value" },
  "guide": [ { "title": "String", "description": "String" } ],
  "resources": [ { "title": "String", "url": "String" } ],
  "terminals": [ { "name": "String", "pins": ["String"], "desc": "String", "type": "String" } ]
}
`;

export const RelayDatabase: React.FC = () => {
    const { getApiKey, config, getCurrentModel, isConfigured } = useAIConfig();
    const { user } = useAuth();

    // State
    const [devices, setDevices] = useState<DeviceModel[]>(INITIAL_DB);
    const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | 'ALL'>('ALL');
    const [selectedId, setSelectedId] = useState<string>(INITIAL_DB[0].id);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'INFO' | 'GUIDE' | 'WIRING' | 'REGS'>('INFO');

    // Cloud State
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Editing
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<DeviceModel | null>(null);
    const [copiedReg, setCopiedReg] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // AI
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiFile, setAiFile] = useState<File | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // --- Load Data from Cloud ---
    useEffect(() => {
        if (user) {
            fetchDevices();
        }
    }, [user]);

    const fetchDevices = async () => {
        setIsLoadingCloud(true);
        try {
            if (!isSupabaseConfigured) {
                // Offline fallback
                setDevices(INITIAL_DB);
                return;
            }

            // Fetch users private devices
            const { data, error } = await supabase
                .from('user_devices')
                .select('*')
                .eq('user_id', user?.id);

            if (error) throw error;

            if (data) {
                // Map DB format back to DeviceModel
                const mappedDevices: DeviceModel[] = data.map((row: any) => ({
                    ...row.device_data, // Expand JSONB
                    db_id: row.id, // Store real DB ID for updates
                    id: (row.device_data.id || row.id).toString() // Ensure frontend ID is string
                }));

                // If cloud has data, show it. If empty, show demo.
                setDevices(mappedDevices.length > 0 ? mappedDevices : INITIAL_DB);
                if (mappedDevices.length > 0) setSelectedId(mappedDevices[0].id);
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
        } finally {
            setIsLoadingCloud(false);
        }
    };

    // --- Derived ---
    const filteredDevices = devices.filter(d =>
        (selectedCategory === 'ALL' || d.category === selectedCategory) &&
        (d.model.toLowerCase().includes(search.toLowerCase()) || d.vendor.toLowerCase().includes(search.toLowerCase()))
    );

    const selectedDevice = devices.find(d => d.id === selectedId) || (devices.length > 0 ? devices[0] : null);

    const activeCategoryConfig = selectedDevice
        ? CATEGORIES.find(c => c.id === (isEditing && editForm ? editForm.category : selectedDevice.category))
        : CATEGORIES[0];

    // --- Actions ---

    const handleSelectDevice = (id: string) => {
        if (isEditing) {
            if (!window.confirm("Несохраненные изменения будут потеряны.")) return;
            setIsEditing(false);
        }
        setSelectedId(id);
        setActiveTab('INFO');
    };

    const handleStartEdit = () => {
        if (!selectedDevice) return;
        setEditForm(JSON.parse(JSON.stringify(selectedDevice)));
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editForm || !user) return;
        setIsSaving(true);

        try {
            if (isSupabaseConfigured) {
                // Check if user is real (UUID check)
                if (!user.id || user.id.startsWith('demo')) {
                    throw new Error("Нельзя сохранять в облако в демо-режиме. Пожалуйста, войдите в аккаунт.");
                }

                // Prepare data for DB
                const deviceData = { ...editForm };
                delete deviceData.db_id; // Don't store db_id inside the JSON

                if (editForm.db_id) {
                    // UPDATE existing
                    const { error } = await supabase
                        .from('user_devices')
                        .update({ device_data: deviceData })
                        .eq('id', editForm.db_id);

                    if (error) throw error;
                } else {
                    // INSERT new
                    const { data, error } = await supabase
                        .from('user_devices')
                        .insert([{ user_id: user.id, device_data: deviceData }])
                        .select(); // Return data to get ID

                    if (error) throw error;
                    if (data && data[0]) {
                        editForm.db_id = data[0].id;
                    }
                }
            } else {
                // Mock Save
                await new Promise(r => setTimeout(r, 500));
            }

            // Update local state
            setDevices(prev => {
                const existing = prev.findIndex(d => d.id === editForm.id);
                if (existing !== -1) {
                    const newArr = [...prev];
                    newArr[existing] = editForm;
                    return newArr;
                }
                return [...prev, editForm];
            });

            setIsEditing(false);
            setEditForm(null);
        } catch (err: any) {
            console.error("Save failed:", err);
            alert(`Ошибка при сохранении: ${err.message || err.error_description || 'Неизвестная ошибка'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateNew = () => {
        const cat = selectedCategory === 'ALL' ? 'TERMINAL' : selectedCategory;
        const newDevice: DeviceModel = {
            id: `dev_${Date.now()}`,
            category: cat,
            vendor: 'New Vendor',
            model: 'New Device',
            series: '',
            description: '',
            protocols: [],
            specs: {},
            guide: [],
            resources: [],
            contacts: [],
            terminals: [],
            registers: []
        };
        // Optimistic add to list
        setDevices(prev => [...prev, newDevice]);
        setSelectedId(newDevice.id);
        setEditForm(newDevice);
        setIsEditing(true);
    };

    // Triggered by button click
    const handleDeleteClick = () => {
        if (!selectedDevice) return;
        setIsDeleteModalOpen(true);
    };

    // Triggered by Modal Confirm
    const confirmDelete = async () => {
        if (!selectedDevice) {
            setIsDeleteModalOpen(false);
            return;
        }

        setIsSaving(true);

        try {
            if (selectedDevice.db_id && isSupabaseConfigured) {
                const { error } = await supabase.from('user_devices').delete().eq('id', selectedDevice.db_id);
                if (error) throw error;
            }

            // Remove from local state
            const newDevs = devices.filter(d => d.id !== selectedDevice.id);
            setDevices(newDevs);

            if (newDevs.length > 0) setSelectedId(newDevs[0].id);
            else setSelectedId('');

            setIsEditing(false);
        } catch (err: any) {
            console.error("Delete error:", err);
            alert(`Ошибка удаления: ${err.message}`);
        } finally {
            setIsSaving(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedReg(text);
        setTimeout(() => setCopiedReg(null), 1000);
    };

    const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editForm) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { alert("Макс 2MB"); return; }
            const reader = new FileReader();
            reader.onloadend = () => setEditForm({ ...editForm, image: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    // ... (AI Logic) ...
    const runAiAnalysis = async () => {
        if (!aiFile) return;
        setIsAiLoading(true);
        try {
            const currentModel = getCurrentModel();

            if (!currentModel || !isConfigured) {
                throw new Error('AI не настроен. Пожалуйста, настройте API ключи в настройках.');
            }

            // Client-side authentication check
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Unauthorized: Please log in.');

            // Read file to Base64
            const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result as string;
                    // Remove data:mime/type;base64, prefix
                    const base64 = res.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(aiFile);
            });

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fileData: base64Data,
                    mimeType: aiFile.type,
                    prompt: AI_DEVICE_PROMPT,
                    model: currentModel.id,
                    provider: currentModel.provider
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server Analysis Error');
            }

            const dataRes = await response.json();
            const jsonStr = dataRes.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "";

            if (!jsonStr) throw new Error("Empty response from AI");

            let data;
            try {
                data = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse JSON", jsonStr);
                throw new Error("AI вернул некорректный JSON. Попробуйте еще раз.");
            }

            if (editForm) {
                const mappedGuide: GuideStep[] = (data.guide || []).map((g: any, i: number) => ({
                    id: `ai_${Date.now()}_${i}`,
                    title: g.title || `Step ${i + 1}`,
                    description: g.description || ''
                }));

                setEditForm({
                    ...editForm,
                    category: data.category || editForm.category,
                    vendor: data.vendor || editForm.vendor,
                    model: data.model || editForm.model,
                    series: data.series || editForm.series,
                    description: data.description || editForm.description,
                    protocols: data.protocols || editForm.protocols,
                    specs: { ...editForm.specs, ...data.specs },
                    guide: mappedGuide.length ? mappedGuide : editForm.guide,
                    resources: data.resources || editForm.resources,
                    terminals: data.terminals || editForm.terminals
                });
            }
            setAiModalOpen(false);
        } catch (e: any) {
            console.error(e);
            alert(`Ошибка анализа AI: ${e.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Helpers ---
    const updateEditField = (field: keyof DeviceModel, value: any) => {
        if (editForm) setEditForm({ ...editForm, [field]: value });
    };
    const updateSpecField = (key: string, value: string) => {
        if (editForm) setEditForm({ ...editForm, specs: { ...editForm.specs, [key]: value } });
    };
    const removeSpecField = (key: string) => {
        if (editForm) {
            const newSpecs = { ...editForm.specs };
            delete newSpecs[key];
            setEditForm({ ...editForm, specs: newSpecs });
        }
    };

    // Resource Helpers
    const updateResource = (idx: number, field: keyof ResourceLink, value: string) => {
        if (editForm) {
            const res = [...editForm.resources];
            res[idx] = { ...res[idx], [field]: value };
            setEditForm({ ...editForm, resources: res });
        }
    };
    const addResource = () => {
        if (editForm) setEditForm({ ...editForm, resources: [...editForm.resources, { title: '', url: '' }] });
    };
    const removeResource = (idx: number) => {
        if (editForm) {
            const res = editForm.resources.filter((_, i) => i !== idx);
            setEditForm({ ...editForm, resources: res });
        }
    };

    // Contact Helpers
    const updateContact = (idx: number, field: keyof Contact, value: string) => {
        if (editForm) {
            const cts = [...editForm.contacts];
            cts[idx] = { ...cts[idx], [field]: value };
            setEditForm({ ...editForm, contacts: cts });
        }
    };
    const addContact = () => {
        if (editForm) setEditForm({ ...editForm, contacts: [...editForm.contacts, { id: Date.now().toString(), name: '', role: '', phone: '', email: '' }] });
    };
    const removeContact = (idx: number) => {
        if (editForm) {
            const cts = editForm.contacts.filter((_, i) => i !== idx);
            setEditForm({ ...editForm, contacts: cts });
        }
    };

    const decToHex = (decStr: string): string => {
        try {
            const num = parseInt(decStr, 10);
            return isNaN(num) ? '-' : '0x' + num.toString(16).toUpperCase().padStart(4, '0');
        } catch { return '-'; }
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto pb-12 h-[calc(100vh-140px)] flex flex-col relative">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <HardDrive className="text-blue-500" /> База Устройств
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Централизованный каталог оборудования АСУ ТП</p>
                </div>

                {/* Cloud Status */}
                <div className="flex items-center gap-2">
                    {user && isSupabaseConfigured ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/30 rounded-full text-xs text-green-400">
                            {isLoadingCloud ? <RefreshCw className="animate-spin" size={14} /> : <Cloud size={14} />}
                            <span>Облако подключено</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-500">
                            <CloudOff size={14} />
                            <span>{user ? 'Оффлайн режим' : 'Локальный режим'}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">

                {/* 1. Category Sidebar */}
                <div className="w-16 flex flex-col gap-2 shrink-0">
                    <button onClick={() => setSelectedCategory('ALL')} className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${selectedCategory === 'ALL' ? 'bg-white text-black shadow-lg shadow-white/20' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`} title="Все категории">
                        <Grid size={24} />
                    </button>
                    <div className="w-full h-px bg-gray-800 my-2"></div>
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all border border-transparent ${selectedCategory === cat.id ? `bg-gray-900 ${cat.color} border-${cat.color.split('-')[1]}-500/50 shadow-lg` : 'bg-gray-900 text-gray-600 hover:text-gray-300 hover:bg-gray-800'}`} title={cat.label}>
                            {cat.icon}
                        </button>
                    ))}
                </div>

                {/* 2. Device List Sidebar */}
                <div className="w-80 flex flex-col gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-hidden shrink-0">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="Поиск..." />
                        </div>
                        <button onClick={handleCreateNew} disabled={!user} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-lg transition-colors" title="Добавить">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                        {isLoadingCloud ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : filteredDevices.map(device => {
                            const catConfig = CATEGORIES.find(c => c.id === device.category);
                            return (
                                <button key={device.id} onClick={() => handleSelectDevice(device.id)} className={`w-full text-left p-3 rounded-lg border transition-all ${selectedId === device.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-950/50 border-gray-800 hover:bg-gray-800'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold">{device.vendor}</span>
                                        <span className={`text-[10px] ${catConfig?.color}`}>{catConfig?.icon}</span>
                                    </div>
                                    <div className={`font-bold truncate ${selectedId === device.id ? 'text-blue-400' : 'text-white'}`}>{device.model}</div>
                                    <div className="text-xs text-gray-600 truncate mt-1">{device.series}</div>
                                </button>
                            );
                        })}
                        {filteredDevices.length === 0 && !isLoadingCloud && (
                            <div className="text-center py-4 text-xs text-gray-500">Устройств не найдено</div>
                        )}
                    </div>
                </div>

                {/* 3. Main Detail Area */}
                <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl relative min-w-0">

                    {(!selectedDevice && !isEditing) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <HardDrive size={64} className="mb-4 opacity-50" />
                            <p className="text-lg font-bold">База пуста</p>
                            <p className="text-sm mb-4">Выберите устройство или создайте новое</p>
                            {user && <button onClick={handleCreateNew} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"><Plus size={18} /> Создать</button>}
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="bg-gray-950 border-b border-gray-800 p-6 pb-0">
                                <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                                    {/* Device Info Block */}
                                    <div className="flex gap-6 items-start w-full">
                                        <div className={`w-24 h-24 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 shrink-0 ${activeCategoryConfig?.color} relative overflow-hidden group`}>
                                            {isEditing && editForm?.image ? (
                                                <img src={editForm.image} className="w-full h-full object-cover" alt="Device" />
                                            ) : !isEditing && selectedDevice?.image ? (
                                                <img src={selectedDevice.image} className="w-full h-full object-cover" alt="Device" />
                                            ) : (
                                                React.cloneElement(activeCategoryConfig?.icon as React.ReactElement<any>, { size: 48 })
                                            )}
                                            {isEditing && (
                                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                    <Camera className="text-white" size={24} />
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
                                                </label>
                                            )}
                                        </div>

                                        {isEditing && editForm ? (
                                            <div className="space-y-2 w-full max-w-lg">
                                                <div className="flex gap-2">
                                                    <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-400 w-1/3" placeholder="Vendor" value={editForm.vendor} onChange={e => updateEditField('vendor', e.target.value)} />
                                                    <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xl font-bold text-white w-2/3" placeholder="Model" value={editForm.model} onChange={e => updateEditField('model', e.target.value)} />
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <select value={editForm.category} onChange={e => updateEditField('category', e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none">
                                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    </select>
                                                    <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-400 flex-1" placeholder="Description" value={editForm.description} onChange={e => updateEditField('description', e.target.value)} />
                                                </div>
                                                <button onClick={() => { setAiFile(null); setAiModalOpen(true); }} className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300"><Sparkles size={12} /> Импорт из PDF (AI)</button>
                                            </div>
                                        ) : (
                                            selectedDevice && (
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h2 className="text-3xl font-extrabold text-white">{selectedDevice.model}</h2>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] bg-gray-800 border border-gray-700 uppercase font-bold ${activeCategoryConfig?.color}`}>{activeCategoryConfig?.id}</span>
                                                    </div>
                                                    <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">{selectedDevice.description}</p>
                                                    <div className="flex flex-wrap gap-2 mt-4">
                                                        {selectedDevice.protocols.map(p => <span key={p} className="px-2 py-1 rounded bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-bold">{p}</span>)}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-start shrink-0">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSaveEdit} disabled={isSaving} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg flex items-center gap-2">
                                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                                </button>
                                                <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg"><X size={20} /></button>
                                            </>
                                        ) : (
                                            user && (
                                                <>
                                                    <button onClick={handleStartEdit} className="p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg border border-gray-700"><Edit3 size={20} /></button>
                                                    <button onClick={handleDeleteClick} disabled={isSaving} className="p-2 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-lg border border-gray-700 disabled:opacity-50"><Trash2 size={20} /></button>
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex gap-6">
                                    {(['INFO', 'GUIDE', 'WIRING', 'REGS'] as const).map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                            {tab === 'INFO' && <Book size={16} />}
                                            {tab === 'GUIDE' && <Wrench size={16} />}
                                            {tab === 'WIRING' && <Cable size={16} />}
                                            {tab === 'REGS' && <Grid size={16} />}
                                            {tab === 'INFO' ? 'Характеристики' : tab === 'GUIDE' ? 'Руководство' : tab === 'WIRING' ? 'Схема' : 'Карта Регистров'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 bg-gray-900/50">

                                {activeTab === 'INFO' && selectedDevice && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700">
                                                <h3 className={`font-bold mb-4 flex items-center gap-2 ${activeCategoryConfig?.color}`}>{activeCategoryConfig?.icon} Технические Данные</h3>
                                                <div className="space-y-4">
                                                    {/* Predefined Fields */}
                                                    {activeCategoryConfig?.specFields.map(field => (
                                                        <div key={field.key}>
                                                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">{field.label}</label>
                                                            {isEditing && editForm ? (
                                                                <input className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" placeholder={field.placeholder} value={editForm.specs[field.key] || ''} onChange={e => updateSpecField(field.key, e.target.value)} />
                                                            ) : (
                                                                <div className="text-white text-sm font-medium border-b border-gray-700/50 pb-1">{selectedDevice.specs[field.key] || <span className="text-gray-600 italic">-</span>}</div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* Dynamic/Additional Fields */}
                                                    <div className="pt-4 border-t border-gray-700/50 mt-2">
                                                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Дополнительно</div>
                                                        {(isEditing && editForm ? Object.entries(editForm.specs) : Object.entries(selectedDevice.specs)).map(([key, val]) => {
                                                            // Skip if in predefined list
                                                            if (activeCategoryConfig?.specFields.find(f => f.key === key)) return null;

                                                            return (
                                                                <div key={key} className="mb-3 flex items-center gap-2">
                                                                    <div className="flex-1">
                                                                        <div className="text-[10px] text-gray-500">{key}</div>
                                                                        {isEditing && editForm ? (
                                                                            <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white" value={val} onChange={e => updateSpecField(key, e.target.value)} />
                                                                        ) : (
                                                                            <div className="text-white text-sm font-medium border-b border-gray-700/50 pb-1">{val}</div>
                                                                        )}
                                                                    </div>
                                                                    {isEditing && (
                                                                        <button onClick={() => removeSpecField(key)} className="text-red-500 p-1 hover:bg-gray-800 rounded mt-3"><Trash2 size={14} /></button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {isEditing && editForm && (
                                                            <button
                                                                onClick={() => {
                                                                    const key = prompt("Название параметра (например: Weight):");
                                                                    if (key) updateSpecField(key, "");
                                                                }}
                                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                                                            >
                                                                <Plus size={12} /> Добавить параметр
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700">
                                                <h3 className="text-white font-bold mb-4">Общее</h3>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between border-b border-gray-700 pb-1"><span className="text-gray-500">Производитель</span><span className="text-white">{isEditing && editForm ? editForm.vendor : selectedDevice.vendor}</span></div>
                                                    <div className="flex justify-between border-b border-gray-700 pb-1"><span className="text-gray-500">Серия</span>{isEditing && editForm ? <input className="bg-transparent text-right w-1/2 border-b border-gray-600" value={editForm.series} onChange={e => updateEditField('series', e.target.value)} /> : <span>{selectedDevice.series}</span>}</div>
                                                    <div><span className="text-gray-500 block mb-1">Протоколы</span>{isEditing && editForm ? <input className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm" value={editForm.protocols.join(', ')} onChange={e => updateEditField('protocols', e.target.value.split(',').map(s => s.trim()))} /> : <div className="flex flex-wrap gap-2">{selectedDevice.protocols.map(p => <span key={p} className="px-2 py-0.5 bg-gray-700 rounded text-xs">{p}</span>)}</div>}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'GUIDE' && selectedDevice && (
                                    <div className="animate-fade-in h-full flex flex-col xl:flex-row gap-6">
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-white font-bold flex items-center gap-2"><FileCheck className="text-emerald-400" size={20} /> Гайд по настройке</h3>
                                                {isEditing && editForm && <button onClick={() => setEditForm({ ...editForm, guide: [...editForm.guide, { id: `step_${Date.now()}`, title: 'Новый шаг', description: '' }] })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2"><Plus size={16} /> Добавить шаг</button>}
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 space-y-4">
                                                {(isEditing && editForm ? editForm.guide : selectedDevice.guide).map((step, idx) => (
                                                    <div key={step.id} className="bg-gray-800/40 border border-gray-700 rounded-xl p-5 relative group">
                                                        <div className="flex gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-600 flex items-center justify-center font-bold text-gray-400 shrink-0 mt-1">{idx + 1}</div>
                                                            <div className="flex-1 space-y-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">{isEditing && editForm ? <input value={step.title} onChange={e => { const g = [...editForm.guide]; g[idx].title = e.target.value; setEditForm({ ...editForm, guide: g }); }} className="bg-transparent text-lg font-bold text-white outline-none w-full border-b border-transparent focus:border-blue-500" placeholder="Заголовок шага" /> : <h4 className="text-lg font-bold text-white">{step.title}</h4>}</div>
                                                                    {isEditing && editForm && <button onClick={() => { const g = editForm.guide.filter(s => s.id !== step.id); setEditForm({ ...editForm, guide: g }); }} className="p-1 hover:bg-red-500/20 text-red-400 rounded"><X size={16} /></button>}
                                                                </div>
                                                                {isEditing && editForm ? <textarea value={step.description} onChange={e => { const g = [...editForm.guide]; g[idx].description = e.target.value; setEditForm({ ...editForm, guide: g }); }} className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-gray-300 outline-none focus:border-blue-500 min-h-[100px]" placeholder="Описание..." /> : <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{step.description}</p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sidebar for Resources and Contacts */}
                                        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">

                                            {/* Resources */}
                                            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe size={16} className="text-blue-400" /> Ресурсы</h3>
                                                    {isEditing && editForm && <button onClick={addResource} className="text-gray-400 hover:text-white"><Plus size={16} /></button>}
                                                </div>
                                                <div className="space-y-2">
                                                    {(isEditing && editForm ? editForm.resources : selectedDevice.resources).map((res, i) => (
                                                        <div key={i} className="text-sm bg-gray-900/50 p-2 rounded border border-gray-800">
                                                            {isEditing && editForm ? (
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <input className="bg-transparent border-b border-gray-700 text-white w-full text-xs" placeholder="Название" value={res.title} onChange={e => updateResource(i, 'title', e.target.value)} />
                                                                        <button onClick={() => removeResource(i)} className="text-red-500 ml-1"><X size={12} /></button>
                                                                    </div>
                                                                    <input className="bg-transparent border-b border-gray-700 text-gray-400 w-full text-xs" placeholder="URL" value={res.url} onChange={e => updateResource(i, 'url', e.target.value)} />
                                                                </div>
                                                            ) : (
                                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                                                                    <LinkIcon size={12} /> {res.title} <ExternalLink size={10} className="text-gray-600" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(!selectedDevice.resources.length && !isEditing) && <div className="text-xs text-gray-600 italic">Нет ссылок</div>}
                                                </div>
                                            </div>

                                            {/* Contacts */}
                                            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} className="text-purple-400" /> Контакты</h3>
                                                    {isEditing && editForm && <button onClick={addContact} className="text-gray-400 hover:text-white"><Plus size={16} /></button>}
                                                </div>
                                                <div className="space-y-2">
                                                    {(isEditing && editForm ? editForm.contacts : selectedDevice.contacts).map((c, i) => (
                                                        <div key={i} className="text-sm bg-gray-900/50 p-3 rounded border border-gray-800 relative group">
                                                            {isEditing && editForm ? (
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <input className="bg-transparent border-b border-gray-700 text-white w-full text-xs font-bold" placeholder="Имя" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                                                                        <button onClick={() => removeContact(i)} className="text-red-500 ml-1"><X size={12} /></button>
                                                                    </div>
                                                                    <input className="bg-transparent border-b border-gray-700 text-gray-400 w-full text-xs" placeholder="Роль (Техподдержка)" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                                                                    <input className="bg-transparent border-b border-gray-700 text-gray-400 w-full text-xs" placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                                                                    <input className="bg-transparent border-b border-gray-700 text-gray-400 w-full text-xs" placeholder="Email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="font-bold text-white">{c.name}</div>
                                                                    <div className="text-xs text-gray-500 mb-1">{c.role}</div>
                                                                    {c.phone && <div className="flex items-center gap-2 text-gray-400 text-xs"><Phone size={10} /> {c.phone}</div>}
                                                                    {c.email && <div className="flex items-center gap-2 text-gray-400 text-xs"><Mail size={10} /> {c.email}</div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(!selectedDevice.contacts.length && !isEditing) && <div className="text-xs text-gray-600 italic">Нет контактов</div>}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}

                                {activeTab === 'WIRING' && selectedDevice && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-white font-bold flex items-center gap-2"><Cable className="text-orange-400" size={20} /> Схема Подключения</h3>
                                            {isEditing && editForm && <button onClick={() => setEditForm({ ...editForm, terminals: [...editForm.terminals, { name: '', pins: [], desc: '', type: 'Input' }] })} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2"><Plus size={16} /> Добавить клемму</button>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {(isEditing && editForm ? editForm.terminals : selectedDevice.terminals).map((term, i) => (
                                                <div key={i} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 relative group">
                                                    {isEditing && editForm ? (
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <input className="bg-transparent font-bold text-white border-b border-gray-600 w-2/3" placeholder="Название (X1)" value={term.name} onChange={e => { const t = [...editForm.terminals]; t[i].name = e.target.value; setEditForm({ ...editForm, terminals: t }); }} />
                                                                <button onClick={() => { setEditForm({ ...editForm, terminals: editForm.terminals.filter((_, idx) => idx !== i) }); }} className="text-red-500"><X size={16} /></button>
                                                            </div>
                                                            <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs w-full text-gray-300" placeholder="Pins (1, 2, 3)" value={term.pins.join(', ')} onChange={e => { const t = [...editForm.terminals]; t[i].pins = e.target.value.split(',').map(s => s.trim()); setEditForm({ ...editForm, terminals: t }); }} />
                                                            <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs w-full text-gray-300" placeholder="Описание" value={term.desc} onChange={e => { const t = [...editForm.terminals]; t[i].desc = e.target.value; setEditForm({ ...editForm, terminals: t }); }} />
                                                            <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs w-full text-gray-300" value={term.type} onChange={e => { const t = [...editForm.terminals]; t[i].type = e.target.value; setEditForm({ ...editForm, terminals: t }); }}>
                                                                <option value="Input">Вход (Input)</option>
                                                                <option value="Output">Выход (Output)</option>
                                                                <option value="Power">Питание</option>
                                                                <option value="Comms">Связь</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-bold text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> {term.name}</h4>
                                                                <span className="px-2 py-0.5 rounded bg-gray-900 text-[10px] text-gray-500 uppercase border border-gray-700">{term.type}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mb-3">
                                                                {term.pins.map(pin => (
                                                                    <span key={pin} className="px-2 py-1 bg-gray-700/50 rounded text-xs font-mono text-orange-200 border border-orange-500/20">{pin}</span>
                                                                ))}
                                                            </div>
                                                            <p className="text-xs text-gray-400">{term.desc}</p>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                            {(!selectedDevice.terminals.length && !isEditing) && <div className="col-span-full text-center text-gray-500 py-10">Нет информации о схеме подключения</div>}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'REGS' && selectedDevice && (
                                    <div className="animate-fade-in bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-900 text-gray-400 font-bold">
                                                <tr><th className="p-4 border-b border-gray-800 w-24">Addr</th><th className="p-4 border-b border-gray-800 w-24">Hex</th><th className="p-4 border-b border-gray-800">Parameter</th><th className="p-4 border-b border-gray-800 w-24">Type</th><th className="p-4 border-b border-gray-800 w-16">Bit</th><th className="p-4 border-b border-gray-800">Desc</th><th className="p-4 border-b border-gray-800 w-10"></th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                                {(isEditing && editForm ? editForm.registers : selectedDevice.registers).map((reg, i) => (
                                                    <tr key={i} className="hover:bg-gray-900 transition-colors">
                                                        {isEditing && editForm ? (
                                                            <><td className="p-2"><input className="w-full bg-black/20" value={reg.addr} onChange={e => { const r = [...editForm.registers]; r[i].addr = e.target.value; setEditForm({ ...editForm, registers: r }); }} /></td><td className="p-2 text-gray-500">{decToHex(reg.addr)}</td><td className="p-2"><input className="w-full bg-black/20" value={reg.name} onChange={e => { const r = [...editForm.registers]; r[i].name = e.target.value; setEditForm({ ...editForm, registers: r }); }} /></td><td className="p-2"><input className="w-full bg-black/20" value={reg.type} onChange={e => { const r = [...editForm.registers]; r[i].type = e.target.value; setEditForm({ ...editForm, registers: r }); }} /></td><td className="p-2"><input className="w-full bg-black/20" value={reg.bit} onChange={e => { const r = [...editForm.registers]; r[i].bit = e.target.value; setEditForm({ ...editForm, registers: r }); }} /></td><td className="p-2"><input className="w-full bg-black/20" value={reg.desc} onChange={e => { const r = [...editForm.registers]; r[i].desc = e.target.value; setEditForm({ ...editForm, registers: r }); }} /></td><td className="p-2"><button onClick={() => { setEditForm({ ...editForm, registers: editForm.registers.filter((_, idx) => idx !== i) }); }} className="text-red-500"><Trash2 size={14} /></button></td></>
                                                        ) : (
                                                            <><td className="p-4 font-mono text-amber-400">{reg.addr}</td><td className="p-4 font-mono text-xs text-blue-400">{decToHex(reg.addr)}</td><td className="p-4 font-bold text-white">{reg.name}</td><td className="p-4 text-xs font-mono"><span className="px-2 py-1 bg-gray-800 rounded">{reg.type}</span></td><td className="p-4 text-center font-mono text-purple-400">{reg.bit}</td><td className="p-4 text-gray-400">{reg.desc}</td><td className="p-4 text-center"><button onClick={() => handleCopy(reg.addr)} className="text-gray-600 hover:text-white">{copiedReg === reg.addr ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}</button></td></>
                                                        )}
                                                    </tr>
                                                ))}
                                                {isEditing && editForm && <tr><td colSpan={7} className="p-2"><button onClick={() => setEditForm({ ...editForm, registers: [...editForm.registers, { addr: '', name: '', type: 'UINT16', bit: '', desc: '' }] })} className="w-full py-2 border border-dashed border-gray-700 text-gray-500 hover:bg-gray-800">+ Add Row</button></td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* AI Modal */}
            {aiModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-500" /> AI Import</h3>
                            <button onClick={() => setAiModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center mb-6 relative hover:border-purple-500 hover:bg-gray-800/30 transition-all">
                            <input type="file" accept=".pdf" onChange={e => {
                                if (e.target.files?.[0]) {
                                    if (e.target.files[0].size > 3 * 1024 * 1024) {
                                        alert("Файл слишком большой. Максимум 3MB для облачной обработки.");
                                        return;
                                    }
                                    setAiFile(e.target.files[0]);
                                }
                            }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            {aiFile ? <div className="text-center"><FileText size={40} className="mx-auto text-purple-400 mb-2" /><p className="text-white font-bold">{aiFile.name}</p></div> : <div className="text-center"><Upload size={40} className="mx-auto text-gray-500 mb-2" /><p className="text-gray-400">Drag & Drop PDF Manual</p></div>}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setAiModalOpen(false)} className="px-4 py-2 text-gray-400">Cancel</button>
                            <button onClick={runAiAnalysis} disabled={!aiFile || isAiLoading} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">{isAiLoading ? <Loader2 className="animate-spin" /> : <Sparkles />} Recognize</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm relative">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Удалить устройство?</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Вы собираетесь удалить <b>{selectedDevice?.model || 'выбранное устройство'}</b>. Это действие необратимо.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Удалить'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};