import React, { useState, useEffect, useMemo } from 'react';
import { calculateModbusCRC, numToHex2, numToHex4 } from '../utils/converterUtils';
import { ArrowDown, Copy, Check, Settings, PlayCircle, Terminal } from 'lucide-react';

interface FramePart {
  label: string;
  value: string;
  color: string; // Tailwind class
  desc: string;
}

const functionCodes = [
  { code: 1, name: '01: Read Coils', type: 'read' },
  { code: 2, name: '02: Read Discrete Inputs', type: 'read' },
  { code: 3, name: '03: Read Holding Registers', type: 'read' },
  { code: 4, name: '04: Read Input Registers', type: 'read' },
  { code: 5, name: '05: Write Single Coil', type: 'write' },
  { code: 6, name: '06: Write Single Register', type: 'write' },
];

export const ModbusBuilder: React.FC = () => {
  const [slaveId, setSlaveId] = useState<number>(1);
  const [functionCode, setFunctionCode] = useState<number>(3);
  const [startAddress, setStartAddress] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(10); // Used for reads
  const [writeValue, setWriteValue] = useState<number>(0); // Used for writes (05, 06)
  const [copied, setCopied] = useState<boolean>(false);

  // --- Helpers ---
  const isRead = [1, 2, 3, 4].includes(functionCode);
  
  // --- Request Frame Logic ---
  const requestFrame = useMemo(() => {
    const frame: number[] = [];
    frame.push(slaveId);
    frame.push(functionCode);
    
    // Address (Hi, Lo)
    frame.push((startAddress >> 8) & 0xFF);
    frame.push(startAddress & 0xFF);

    if (isRead) {
        // Quantity (Hi, Lo)
        frame.push((quantity >> 8) & 0xFF);
        frame.push(quantity & 0xFF);
    } else {
        // Write Value (Hi, Lo)
        if (functionCode === 5) {
             // For Coil: 0xFF00 is ON, 0x0000 is OFF. Input is likely 0 or 1.
             // Let's assume user inputs 0 or 1, or 255.
             const val = writeValue > 0 ? 0xFF00 : 0x0000;
             frame.push((val >> 8) & 0xFF);
             frame.push(val & 0xFF);
        } else {
             // Register
             frame.push((writeValue >> 8) & 0xFF);
             frame.push(writeValue & 0xFF);
        }
    }

    const crc = calculateModbusCRC(frame);
    // Modbus Little Endian for CRC
    frame.push(crc & 0xFF);
    frame.push((crc >> 8) & 0xFF);
    
    return frame;
  }, [slaveId, functionCode, startAddress, quantity, writeValue, isRead]);

  // --- Response Frame Simulation ---
  const responseFrame = useMemo(() => {
    const frame: number[] = [];
    frame.push(slaveId);
    frame.push(functionCode);

    if (isRead) {
        const bytes = (functionCode === 1 || functionCode === 2) 
            ? Math.ceil(quantity / 8) 
            : quantity * 2;
        
        frame.push(bytes); // Byte Count

        // Mock Data: Fill with 0s or placeholder pattern (e.g. 00 AA 00 AA)
        for (let i = 0; i < bytes; i++) {
            frame.push(0); 
        }

    } else {
        // Echo request for 05, 06
        frame.push((startAddress >> 8) & 0xFF);
        frame.push(startAddress & 0xFF);
        
        if (functionCode === 5) {
             const val = writeValue > 0 ? 0xFF00 : 0x0000;
             frame.push((val >> 8) & 0xFF);
             frame.push(val & 0xFF);
        } else {
             frame.push((writeValue >> 8) & 0xFF);
             frame.push(writeValue & 0xFF);
        }
    }

    const crc = calculateModbusCRC(frame);
    frame.push(crc & 0xFF);
    frame.push((crc >> 8) & 0xFF);

    return frame;
  }, [slaveId, functionCode, startAddress, quantity, writeValue, isRead, requestFrame]);


  const getHexString = (arr: number[]) => arr.map(b => numToHex2(b)).join(' ');

  const handleCopy = () => {
    navigator.clipboard.writeText(getHexString(requestFrame));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFrameVisual = (frame: number[], type: 'request' | 'response') => {
      const parts: FramePart[] = [];
      
      // Slave ID
      parts.push({ label: 'ID', value: numToHex2(frame[0]), color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', desc: 'Адрес устройства' });
      // Func
      parts.push({ label: 'CMD', value: numToHex2(frame[1]), color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', desc: 'Команда' });
      
      let cursor = 2;

      if (type === 'request') {
          // Address
          parts.push({ 
              label: 'Addr Hi', value: numToHex2(frame[cursor++]), 
              color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', desc: 'Адрес (High)' 
          });
          parts.push({ 
              label: 'Addr Lo', value: numToHex2(frame[cursor++]), 
              color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', desc: 'Адрес (Low)' 
          });

          // Data / Count
          const label = isRead ? 'Count' : 'Value';
          parts.push({ 
              label: `${label} Hi`, value: numToHex2(frame[cursor++]), 
              color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: `${label} (High)` 
          });
          parts.push({ 
              label: `${label} Lo`, value: numToHex2(frame[cursor++]), 
              color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: `${label} (Low)` 
          });
      } else {
          // Response
          if (isRead) {
              const byteCount = frame[cursor];
              parts.push({ label: 'Bytes', value: numToHex2(byteCount), color: 'text-gray-300 border-gray-500/30 bg-gray-500/10', desc: 'Кол-во байт' });
              cursor++;
              // Data payload visual (simplified if too long)
              if (byteCount > 0) {
                 parts.push({ label: 'Data...', value: '...', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: `Данные (${byteCount} байт)` });
                 cursor += byteCount;
              }
          } else {
             // Echo for Write
             parts.push({ label: 'Addr Hi', value: numToHex2(frame[cursor++]), color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', desc: 'Адрес' });
             parts.push({ label: 'Addr Lo', value: numToHex2(frame[cursor++]), color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', desc: 'Адрес' });
             parts.push({ label: 'Val Hi', value: numToHex2(frame[cursor++]), color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: 'Значение' });
             parts.push({ label: 'Val Lo', value: numToHex2(frame[cursor++]), color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', desc: 'Значение' });
          }
      }

      // CRC
      parts.push({ label: 'CRC Lo', value: numToHex2(frame[cursor++]), color: 'text-red-400 border-red-500/30 bg-red-500/10', desc: 'Контрольная сумма' });
      parts.push({ label: 'CRC Hi', value: numToHex2(frame[cursor]), color: 'text-red-400 border-red-500/30 bg-red-500/10', desc: 'Контрольная сумма' });

      return (
          <div className="flex flex-wrap gap-2">
              {parts.map((p, idx) => (
                  <div key={idx} className={`flex flex-col items-center p-3 rounded-lg border ${p.color} min-w-[70px] transition-transform hover:scale-105`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">{p.label}</span>
                      <span className="font-mono text-xl font-bold">{p.value}</span>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="animate-fade-in pb-12">
        <div className="text-center space-y-4 mb-10">
            <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
               <Settings className="text-accent-500" size={40} />
               Конструктор <span className="text-gray-500">Modbus RTU</span>
            </h1>
            <p className="text-gray-400 text-lg">
                Создайте команду и посмотрите, как она выглядит в байтах.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Controls */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Settings size={18} /> Параметры запроса
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Function Code</label>
                            <select 
                                value={functionCode} 
                                onChange={(e) => setFunctionCode(Number(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-500"
                            >
                                {functionCodes.map(fc => (
                                    <option key={fc.code} value={fc.code}>{fc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Slave ID (Адрес устройства)</label>
                            <input 
                                type="number" min="1" max="247"
                                value={slaveId}
                                onChange={(e) => setSlaveId(Math.max(1, Math.min(247, Number(e.target.value))))}
                                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Start Address (Десятичный, 0-65535)</label>
                            <input 
                                type="number" min="0" max="65535"
                                value={startAddress}
                                onChange={(e) => setStartAddress(Math.max(0, Math.min(65535, Number(e.target.value))))}
                                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-500 font-mono"
                            />
                        </div>

                        {isRead ? (
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Количество (Registers/Coils)</label>
                                <input 
                                    type="number" min="1" max="125"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, Math.min(125, Number(e.target.value))))}
                                    className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-500 font-mono"
                                />
                            </div>
                        ) : (
                             <div>
                                <label className="block text-sm text-gray-500 mb-1">
                                    {functionCode === 5 ? 'Значение (0 = OFF, 1 = ON)' : 'Значение регистра (DEC)'}
                                </label>
                                <input 
                                    type="number" min="0" max="65535"
                                    value={writeValue}
                                    onChange={(e) => setWriteValue(Math.max(0, Math.min(65535, Number(e.target.value))))}
                                    className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-accent-500 font-mono"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Visualization */}
            <div className="lg:col-span-8 space-y-6">
                {/* Request Card */}
                <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                            <PlayCircle className="text-emerald-500" />
                            Запрос (Master → Slave)
                        </div>
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-gray-800 px-3 py-1 rounded-md border border-gray-700"
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            {copied ? 'Скопировано' : 'Копировать HEX'}
                        </button>
                    </div>

                    <div className="mb-6 overflow-x-auto pb-4">
                        {renderFrameVisual(requestFrame, 'request')}
                    </div>
                    
                    <div className="bg-black/30 rounded-lg p-4 font-mono text-gray-400 break-all border border-gray-800 flex items-center gap-3">
                         <Terminal size={16} />
                         {getHexString(requestFrame)}
                    </div>
                </div>

                <div className="flex justify-center">
                    <ArrowDown className="text-gray-600 animate-bounce" size={32} />
                </div>

                {/* Response Card */}
                <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50 relative overflow-hidden">
                     {/* Dashed background pattern for simulation feel */}
                     <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                     
                    <div className="flex items-center gap-2 text-white font-bold text-lg mb-6 relative z-10">
                        <Check className="text-blue-500" />
                        Ожидаемый ответ (Slave → Master)
                        <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">Симуляция успеха</span>
                    </div>

                    <div className="mb-6 overflow-x-auto pb-4 relative z-10">
                        {renderFrameVisual(responseFrame, 'response')}
                    </div>

                    <div className="bg-black/30 rounded-lg p-4 font-mono text-gray-500 break-all border border-gray-800 flex items-center gap-3 relative z-10">
                         <Terminal size={16} />
                         {getHexString(responseFrame)}
                    </div>
                    
                    {isRead && (
                        <p className="mt-4 text-sm text-gray-500 relative z-10">
                            * В ответе возвращаются запрошенные данные (здесь показаны нули).
                        </p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};