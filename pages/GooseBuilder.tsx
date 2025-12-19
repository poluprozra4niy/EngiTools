import React, { useState } from 'react';
import { FileJson, Copy, Check, Settings } from 'lucide-react';

export const GooseBuilder: React.FC = () => {
    const [appid, setAppid] = useState('0001');
    const [mac, setMac] = useState('01-0C-CD-01-00-01');
    const [gocb, setGocb] = useState('IEDName/LLN0$GO$gcb01');
    const [vlan, setVlan] = useState('100');
    const [confRev, setConfRev] = useState('1');
    const [copied, setCopied] = useState(false);

    const generateSCL = () => {
        return `
<GSEControl 
    name="${gocb.split('$').pop() || 'gcb01'}" 
    datSet="${gocb.split('$')[0]}$Go$Dataset1" 
    confRev="${confRev}" 
    appID="${appid}"
>
    <IEDName>${gocb.split('/')[0] || 'IED'}</IEDName>
    <GSEControl.P_AppID>${appid}</GSEControl.P_AppID>
    <GSEControl.P_VLAN-ID>${vlan}</GSEControl.P_VLAN-ID>
    <GSEControl.P_VLAN-PRIORITY>4</GSEControl.P_VLAN-PRIORITY>
    <GSEControl.P_MAC-Address>${mac}</GSEControl.P_MAC-Address>
    <GSEControl.MinTime>4</GSEControl.MinTime>
    <GSEControl.MaxTime>1000</GSEControl.MaxTime>
</GSEControl>
`.trim();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateSCL());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <FileJson className="text-emerald-500" size={40} />
                   GOOSE Config Generator
                </h1>
                <p className="text-gray-400">
                    Быстрая генерация параметров для проверки или создания CID файлов.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Settings size={18}/> Параметры</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">GoCB Reference (IED/LD/LN$GO$Name)</label>
                                <input value={gocb} onChange={e => setGocb(e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-white rounded p-2 text-sm font-mono"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">APPID (Hex)</label>
                                    <input value={appid} onChange={e => setAppid(e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-white rounded p-2 text-sm font-mono"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">ConfRev</label>
                                    <input value={confRev} onChange={e => setConfRev(e.target.value)} type="number" className="w-full bg-gray-950 border border-gray-700 text-white rounded p-2 text-sm font-mono"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">MAC Address</label>
                                    <input value={mac} onChange={e => setMac(e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-white rounded p-2 text-sm font-mono"/>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">VLAN ID</label>
                                    <input value={vlan} onChange={e => setVlan(e.target.value)} type="number" className="w-full bg-gray-950 border border-gray-700 text-white rounded p-2 text-sm font-mono"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-white font-bold">SCL Snippet</h3>
                             <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                                 {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                 {copied ? 'Copied' : 'Copy XML'}
                             </button>
                        </div>
                        <pre className="flex-1 bg-gray-950 p-4 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {generateSCL()}
                        </pre>
                     </div>
                </div>
            </div>
        </div>
    );
};