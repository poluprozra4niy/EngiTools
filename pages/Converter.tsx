import React, { useState, useMemo } from 'react';
import { 
  cleanHex, cleanDecimal, hexToDecimal, decimalToHex, decimalToTwosComplement,
  hexToBinary, hexToRegisters, hexToSignedDecimal, 
  decode32Bit, ByteOrder, scaleValue, calculateModbusCRC, numToHex2
} from '../utils/converterUtils';
import { ArrowRight, Copy, Check, Hash, Cpu, AlertCircle, Layers, ArrowLeftRight, FileDigit, Scale, Calculator, ArrowDownUp, RefreshCw, Thermometer, Wind, Zap, Gauge, Ruler } from 'lucide-react';

// --- SUB-COMPONENTS FOR TABS ---

// 1. ORIGINAL CONVERTER
const BaseConverter: React.FC = () => {
  const [mode, setMode] = useState<'HEX' | 'DEC'>('HEX');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const toggleMode = () => {
    setMode(prev => prev === 'HEX' ? 'DEC' : 'HEX');
    setInput('');
  };

  const hexClean = useMemo(() => mode === 'HEX' ? cleanHex(input) : '', [input, mode]);
  const decClean = useMemo(() => mode === 'DEC' ? cleanDecimal(input) : '', [input, mode]);

  const primaryResult = useMemo(() => {
    if (mode === 'HEX') return hexToDecimal(hexClean);
    if (mode === 'DEC') return decimalToHex(decClean);
    return '';
  }, [mode, hexClean, decClean]);

  const visualHex = useMemo(() => {
    if (mode === 'HEX') return hexClean;
    if (mode === 'DEC') {
      if (decClean.startsWith('-')) {
        return decimalToTwosComplement(decClean, 32) || '';
      }
      return decimalToHex(decClean);
    }
    return '';
  }, [mode, hexClean, decClean]);

  const binaryValue = useMemo(() => hexToBinary(visualHex), [visualHex]);
  const registers = useMemo(() => hexToRegisters(visualHex), [visualHex]);
  
  const signed16 = useMemo(() => mode === 'HEX' && hexClean.length <= 4 ? hexToSignedDecimal(hexClean, 16) : null, [hexClean, mode]);
  const signed32 = useMemo(() => mode === 'HEX' && hexClean.length <= 8 ? hexToSignedDecimal(hexClean, 32) : null, [hexClean, mode]);

  const hex16 = useMemo(() => mode === 'DEC' ? decimalToTwosComplement(decClean, 16) : null, [decClean, mode]);
  const hex32 = useMemo(() => mode === 'DEC' ? decimalToTwosComplement(decClean, 32) : null, [decClean, mode]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800 relative group overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
        <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {mode === 'HEX' ? 'Ввод HEX' : 'Ввод Decimal'}
            </label>
            <button onClick={toggleMode} className="text-xs text-accent-500 hover:text-accent-400 underline decoration-dashed underline-offset-4 flex items-center gap-1">
                <ArrowLeftRight size={12} /> {mode === 'HEX' ? 'Switch to DEC' : 'Switch to HEX'}
            </button>
        </div>
        <div className="relative">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'HEX' ? "e.g., 1A2B" : "e.g., 12345"}
            className="w-full bg-gray-950 border border-gray-700 text-white text-3xl font-mono rounded-xl px-4 py-4 focus:ring-2 focus:ring-accent-500 outline-none placeholder-gray-700 uppercase"
            />
        </div>
      </div>

      {(mode === 'HEX' ? hexClean : decClean) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between mb-4">
              <span className="text-gray-400 text-sm font-bold uppercase">{mode === 'HEX' ? 'Decimal' : 'HEX'}</span>
              <button onClick={() => handleCopy(primaryResult, 'prim')} className="text-gray-500 hover:text-white">
                 {copied === 'prim' ? <Check size={18} className="text-green-500"/> : <Copy size={18}/>}
              </button>
            </div>
            <div className="font-mono text-3xl text-emerald-400 break-all">{primaryResult}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
             <span className="text-gray-400 text-sm font-bold uppercase block mb-4">Signed Interpretation</span>
             <div className="space-y-2 font-mono text-lg">
                {mode === 'HEX' ? (
                   <>
                     <div className="flex justify-between"><span className="text-gray-600">INT16</span> <span className="text-blue-300">{signed16 || '-'}</span></div>
                     <div className="flex justify-between"><span className="text-gray-600">INT32</span> <span className="text-blue-300">{signed32 || '-'}</span></div>
                   </>
                ) : (
                   <>
                     <div className="flex justify-between"><span className="text-gray-600">INT16 Hex</span> <span className="text-blue-300">{hex16 || '-'}</span></div>
                     <div className="flex justify-between"><span className="text-gray-600">INT32 Hex</span> <span className="text-blue-300">{hex32 || '-'}</span></div>
                   </>
                )}
             </div>
          </div>
          
          <div className="md:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
             <span className="text-gray-400 text-sm font-bold uppercase block mb-4">Modbus Registers (16-bit)</span>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {registers.map((r, i) => (
                    <div key={i} className="bg-gray-900 p-3 rounded border border-gray-800">
                        <div className="text-xs text-gray-500 mb-1">Reg {i+1}</div>
                        <div className="font-mono text-amber-400">{r}</div>
                        <div className="font-mono text-xs text-gray-600 mt-1">0x{r.toString(16).toUpperCase().padStart(4,'0')}</div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. 32-BIT DECODER
const Bit32Decoder: React.FC = () => {
  const [reg1, setReg1] = useState<string>('0');
  const [reg2, setReg2] = useState<string>('0');
  const [order, setOrder] = useState<ByteOrder>(ByteOrder.ABCD);

  const r1 = parseInt(reg1) || 0;
  const r2 = parseInt(reg2) || 0;

  const result = useMemo(() => decode32Bit(r1, r2, order), [r1, r2, order]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm text-gray-500 mb-1">Регистр 1 (Hi/Lo зависит от порядка)</label>
                <input type="number" value={reg1} onChange={e => setReg1(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white font-mono focus:border-accent-500 outline-none" placeholder="0-65535" />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Регистр 2</label>
                <input type="number" value={reg2} onChange={e => setReg2(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white font-mono focus:border-accent-500 outline-none" placeholder="0-65535" />
            </div>
        </div>

        <div>
            <label className="block text-sm text-gray-500 mb-2">Порядок слов / байт (Endianness)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(ByteOrder).map((bo) => (
                    <button key={bo} onClick={() => setOrder(bo)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${order === bo ? 'bg-accent-600/20 border-accent-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                        {bo}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Float (32-bit)</div>
                    <div className="font-mono text-3xl text-emerald-400">
                        {typeof result.float === 'number' ? result.float.toPrecision(7) : result.float}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Int 32</div>
                    <div className="font-mono text-2xl text-blue-300">{result.int32}</div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">UInt 32</div>
                    <div className="font-mono text-2xl text-purple-300">{result.uint32}</div>
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 uppercase font-bold mb-2">Raw Hex Stream</div>
                <div className="font-mono text-gray-400 bg-gray-950 p-2 rounded">
                    0x{result.hex}
                </div>
            </div>
        </div>
    </div>
  );
};

// 3. SCALING CALCULATOR
const ScalingCalc: React.FC = () => {
    const [raw, setRaw] = useState('0');
    const [rawLow, setRawLow] = useState('4000');
    const [rawHigh, setRawHigh] = useState('20000');
    const [engLow, setEngLow] = useState('0');
    const [engHigh, setEngHigh] = useState('100');
    
    const res = scaleValue(Number(raw), Number(rawLow), Number(rawHigh), Number(engLow), Number(engHigh));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-sm text-gray-400">
                Формула: <span className="font-mono text-gray-300">Y = (X - InLow) * (OutHi - OutLow) / (InHi - InLow) + OutLow</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><Cpu size={16}/> Вход (Raw)</h3>
                    <div>
                        <label className="text-xs text-gray-500">Значение (X)</label>
                        <input type="number" value={raw} onChange={e => setRaw(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded p-2 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-gray-500">Min</label><input type="number" value={rawLow} onChange={e => setRawLow(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded p-2 text-white" /></div>
                        <div><label className="text-xs text-gray-500">Max</label><input type="number" value={rawHigh} onChange={e => setRawHigh(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded p-2 text-white" /></div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <ArrowRight className="text-gray-600 hidden md:block" size={32} />
                    <ArrowDownUp className="text-gray-600 block md:hidden" size={32} />
                </div>

                <div className="space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><Scale size={16}/> Выход (Eng)</h3>
                    <div className="p-4 bg-accent-600/10 border border-accent-500/30 rounded-lg">
                        <label className="text-xs text-accent-300 block mb-1">Результат</label>
                        <div className="text-2xl font-mono text-white font-bold">{res.toFixed(3)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div><label className="text-xs text-gray-500">Min</label><input type="number" value={engLow} onChange={e => setEngLow(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded p-2 text-white" /></div>
                        <div><label className="text-xs text-gray-500">Max</label><input type="number" value={engHigh} onChange={e => setEngHigh(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded p-2 text-white" /></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. CRC CALCULATOR
const CRCCalc: React.FC = () => {
    const [input, setInput] = useState('');
    const bytes = useMemo(() => cleanHex(input).match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [], [input]);
    const crc = useMemo(() => calculateModbusCRC(bytes), [bytes]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <label className="block text-sm text-gray-500 mb-2">Введите байты команды (HEX)</label>
                <textarea 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="01 03 00 00 00 0A"
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white font-mono uppercase focus:border-accent-500 outline-none"
                />
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex-1">
                    <div className="text-sm text-gray-500 mb-1">CRC-16 (Modbus)</div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-mono text-emerald-400 font-bold">
                            {numToHex2(crc & 0xFF)} {numToHex2((crc >> 8) & 0xFF)}
                        </span>
                        <span className="text-gray-600 font-mono mb-1">(Lo Hi)</span>
                    </div>
                </div>
                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex-1">
                     <div className="text-sm text-gray-500 mb-1">Big Endian Value</div>
                     <span className="text-3xl font-mono text-blue-400 font-bold">0x{crc.toString(16).toUpperCase().padStart(4, '0')}</span>
                </div>
            </div>
        </div>
    );
};

// 5. UNIT CONVERTER
const UnitConverter: React.FC = () => {
    const [category, setCategory] = useState<'pressure' | 'temp' | 'flow' | 'power' | 'length'>('pressure');
    const [fromUnit, setFromUnit] = useState<string>('');
    const [toUnit, setToUnit] = useState<string>('');
    const [value, setValue] = useState<string>('1');

    const categories = {
        pressure: { label: 'Давление', icon: <Gauge size={18}/>, units: ['bar', 'psi', 'Pa', 'kPa', 'MPa', 'atm', 'mmHg'] },
        temp: { label: 'Температура', icon: <Thermometer size={18}/>, units: ['C', 'F', 'K'] },
        flow: { label: 'Расход', icon: <Wind size={18}/>, units: ['m3/h', 'l/min', 'l/s', 'GPM', 'CFM'] },
        power: { label: 'Мощность', icon: <Zap size={18}/>, units: ['kW', 'W', 'MW', 'hp', 'kcal/h'] },
        length: { label: 'Длина', icon: <Ruler size={18}/>, units: ['mm', 'cm', 'm', 'km', 'inch', 'ft', 'yd'] }
    };

    // Conversion Logic (Base unit approach)
    const convert = (val: number, from: string, to: string, cat: string): number => {
        if (from === to) return val;
        
        // Temperature special case
        if (cat === 'temp') {
            let celsius = val;
            if (from === 'F') celsius = (val - 32) * 5/9;
            if (from === 'K') celsius = val - 273.15;
            
            if (to === 'C') return celsius;
            if (to === 'F') return (celsius * 9/5) + 32;
            if (to === 'K') return celsius + 273.15;
            return val;
        }

        // Factors to convert TO base unit
        const factors: Record<string, number> = {
            // Pressure (Base: Bar)
            'bar': 1, 'psi': 0.0689476, 'Pa': 0.00001, 'kPa': 0.01, 'MPa': 10, 'atm': 1.01325, 'mmHg': 0.00133322,
            // Flow (Base: m3/h)
            'm3/h': 1, 'l/min': 0.06, 'l/s': 3.6, 'GPM': 0.227125, 'CFM': 1.69901,
            // Power (Base: kW)
            'kW': 1, 'W': 0.001, 'MW': 1000, 'hp': 0.7457, 'kcal/h': 0.00116222,
            // Length (Base: m)
            'm': 1, 'mm': 0.001, 'cm': 0.01, 'km': 1000, 'inch': 0.0254, 'ft': 0.3048, 'yd': 0.9144
        };

        const valInBase = val * (factors[from] || 1);
        return valInBase / (factors[to] || 1);
    };

    // Auto-select first units on category change
    useMemo(() => {
        setFromUnit(categories[category].units[0]);
        setToUnit(categories[category].units[1]);
    }, [category]);

    const result = convert(parseFloat(value) || 0, fromUnit, toUnit, category);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Category Select */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800">
                {Object.entries(categories).map(([key, data]) => (
                    <button
                        key={key}
                        onClick={() => setCategory(key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                            category === key 
                            ? 'bg-accent-600 text-white' 
                            : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        {data.icon} {data.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-900 border border-gray-800 rounded-2xl p-8">
                
                {/* From */}
                <div className="space-y-4">
                    <label className="text-gray-500 text-xs font-bold uppercase">Из (From)</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            value={value} 
                            onChange={e => setValue(e.target.value)} 
                            className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white text-xl font-mono focus:border-accent-500 outline-none"
                        />
                        <select 
                            value={fromUnit} 
                            onChange={e => setFromUnit(e.target.value)}
                            className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-2 text-white text-sm outline-none cursor-pointer hover:bg-gray-700"
                        >
                            {categories[category].units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                {/* To */}
                <div className="space-y-4">
                    <label className="text-gray-500 text-xs font-bold uppercase">В (To)</label>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-3 text-emerald-400 text-xl font-mono font-bold flex items-center overflow-hidden">
                            {result.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </div>
                        <select 
                            value={toUnit} 
                            onChange={e => setToUnit(e.target.value)}
                            className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-2 text-white text-sm outline-none cursor-pointer hover:bg-gray-700"
                        >
                            {categories[category].units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---

export const Converter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BASE' | '32BIT' | 'SCALE' | 'CRC' | 'UNITS'>('BASE');

  const tabs = [
    { id: 'BASE', label: 'Hex/Dec', icon: <ArrowLeftRight size={18} /> },
    { id: '32BIT', label: '32-bit Decoder', icon: <Layers size={18} /> },
    { id: 'SCALE', label: 'Scale', icon: <Scale size={18} /> },
    { id: 'CRC', label: 'CRC Calc', icon: <Calculator size={18} /> },
    { id: 'UNITS', label: 'Единицы', icon: <RefreshCw size={18} /> },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Инженерный Конвертер
        </h1>
        <p className="text-gray-400">Набор утилит для работы с данными и единицами измерения</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium ${
                    activeTab === tab.id 
                    ? 'bg-accent-600 text-white shadow-lg shadow-accent-600/30' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
            >
                {tab.icon}
                {tab.label}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-gray-950/50 rounded-2xl border border-gray-800/50 p-1">
          {activeTab === 'BASE' && <BaseConverter />}
          {activeTab === '32BIT' && <Bit32Decoder />}
          {activeTab === 'SCALE' && <ScalingCalc />}
          {activeTab === 'CRC' && <CRCCalc />}
          {activeTab === 'UNITS' && <UnitConverter />}
      </div>
    </div>
  );
};