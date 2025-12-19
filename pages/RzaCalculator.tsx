import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ZapOff, Activity, AlertTriangle, Calculator, BarChart3, Settings, ArrowRight, ShieldAlert, Compass, FileCheck, Timer, CheckCircle2, XCircle } from 'lucide-react';

type TabType = 'calc' | 'ct' | 'chart' | 'fault' | 'trip_check';
type CurveType = 'Definite' | 'IEC Inverse' | 'Very Inverse' | 'Extremely Inverse';
type FaultType = 'ABC' | 'AB' | 'AN' | 'BN' | 'CN' | 'BC' | 'CA';

// --- Complex Number Helper Class ---
class Complex {
    constructor(public r: number, public i: number) {}
    static fromPolar(mag: number, deg: number) {
        const rad = deg * Math.PI / 180;
        return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
    }
    add(c: Complex) { return new Complex(this.r + c.r, this.i + c.i); }
    sub(c: Complex) { return new Complex(this.r - c.r, this.i - c.i); }
    mul(c: Complex) { return new Complex(this.r * c.r - this.i * c.i, this.r * c.i + this.i * c.r); }
    div(c: Complex) {
        const den = c.r * c.r + c.i * c.i;
        return new Complex((this.r * c.r + this.i * c.i) / den, (this.i * c.r - this.r * c.i) / den);
    }
    mag() { return Math.sqrt(this.r * this.r + this.i * this.i); }
    deg() { return Math.atan2(this.i, this.r) * 180 / Math.PI; }
    scale(s: number) { return new Complex(this.r * s, this.i * s); }
}

export const RzaCalculator: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as TabType) || 'calc';

    const setTab = (tab: TabType) => {
        setSearchParams({ tab });
    };

    // --- State: General & Calc ---
    const [loadCurrent, setLoadCurrent] = useState<number>(100);
    const [kSafety, setKSafety] = useState<number>(1.2);
    const [kReturn, setKReturn] = useState<number>(0.85);
    const [kSelfStart, setKSelfStart] = useState<number>(2.5);
    
    // --- State: CT ---
    const [ctPrimary, setCtPrimary] = useState<number>(200);
    const [ctSecondary, setCtSecondary] = useState<number>(5);
    const [ctConnection, setCtConnection] = useState<'Star' | 'Delta'>('Star');
    
    // --- State: Protection 1 (Main) ---
    const [curve1Type, setCurve1Type] = useState<CurveType>('Definite');
    const [curve1Pickup, setCurve1Pickup] = useState<number>(350); 
    const [curve1Time, setCurve1Time] = useState<number>(0.5);

    // --- State: Protection 2 (Upstream/Backup) ---
    const [curve2Enabled, setCurve2Enabled] = useState(false);
    const [curve2Type, setCurve2Type] = useState<CurveType>('IEC Inverse');
    const [curve2Pickup, setCurve2Pickup] = useState<number>(500);
    const [curve2Time, setCurve2Time] = useState<number>(0.3);

    // --- State: Fault Simulator ---
    const [simVoltage, setSimVoltage] = useState(10000); // V (primary)
    const [simX1, setSimX1] = useState(5); // Ohm (Positive Seq Reactance)
    const [simX0, setSimX0] = useState(15); // Ohm (Zero Seq Reactance, typical ~3x X1)
    const [simR1, setSimR1] = useState(1); // Ohm (Resistance, usually small)
    const [simFaultType, setSimFaultType] = useState<FaultType>('ABC');
    const [simRf, setSimRf] = useState(0); // Fault Resistance

    // --- State: Trip Check ---
    const [tcPickup, setTcPickup] = useState<number>(100);
    const [tcTimeSetting, setTcTimeSetting] = useState<number>(0.1); // TMS or Seconds
    const [tcCurve, setTcCurve] = useState<CurveType>('IEC Inverse');
    const [tcCurrent, setTcCurrent] = useState<number>(150);

    // --- Calculations ---
    const ctRatio = ctPrimary / ctSecondary;
    
    // CT Secondary Load Calculation
    const calculatedSecondaryLoad = useMemo(() => {
        const base = loadCurrent / ctRatio;
        return ctConnection === 'Delta' ? base * Math.sqrt(3) : base;
    }, [loadCurrent, ctRatio, ctConnection]);

    // Recommended Pickup (for Calc tab)
    const recommendedPickupPrimary = (kSelfStart * kSafety * loadCurrent) / kReturn;

    // --- Trip Check Logic ---
    const tripCheckResult = useMemo(() => {
        const multiplicity = tcCurrent / tcPickup;
        let time = -1; // -1 means infinity/no trip
        let isTrip = false;

        if (multiplicity > 1.0) {
            isTrip = true;
            if (tcCurve === 'Definite') {
                time = tcTimeSetting;
            } else {
                let k = 0.14; let alpha = 0.02;
                if (tcCurve === 'Very Inverse') { k = 13.5; alpha = 1.0; }
                if (tcCurve === 'Extremely Inverse') { k = 80.0; alpha = 2.0; }
                
                // IEC 60255 Formula: t = TMS * k / ((I/Is)^alpha - 1)
                time = (tcTimeSetting * k) / (Math.pow(multiplicity, alpha) - 1);
            }
        }

        return { isTrip, time, multiplicity };
    }, [tcPickup, tcTimeSetting, tcCurve, tcCurrent]);


    // --- Fault Simulator Logic ---
    const faultResults = useMemo(() => {
        // Base Phase Voltage (U_nom / sqrt(3)), Angle 0 for Phase A
        const VphMag = simVoltage / Math.sqrt(3);
        const Va = new Complex(VphMag, 0); // Reference vector
        // Rotations
        const a = Complex.fromPolar(1, 120);
        const a2 = Complex.fromPolar(1, 240);

        // Impedances
        const Z1 = new Complex(simR1, simX1);
        const Z2 = Z1; // Assume Z1 ~= Z2 for lines/transformers
        const Z0 = new Complex(simR1 * 3, simX0); // Rough approx if R0 not given
        const Rf = new Complex(simRf, 0);

        let Ia = new Complex(0, 0), Ib = new Complex(0, 0), Ic = new Complex(0, 0);
        let Ua = Va, Ub = Va.mul(a2), Uc = Va.mul(a); // Default healthy voltages

        // Logic based on Fault Type (Simplified Symmetrical Components)
        if (simFaultType === 'ABC') {
            // 3-Phase: Ia = Vph / Z1
            Ia = Va.div(Z1.add(Rf));
            Ib = Ia.mul(a2);
            Ic = Ia.mul(a);
            // Voltage at fault point is 0 (if Rf=0)
            const Vdrop = Ia.mul(Z1);
            Ua = Va.sub(Vdrop);
            Ub = Ua.mul(a2);
            Uc = Ua.mul(a);
        } 
        else if (simFaultType === 'AN') {
            // 1-Phase (A-Gnd): I0 = I1 = I2 = Vph / (Z1+Z2+Z0 + 3Rf)
            const Ztotal = Z1.add(Z2).add(Z0).add(Rf.scale(3));
            const I012 = Va.div(Ztotal);
            Ia = I012.scale(3);
            Ib = new Complex(0, 0);
            Ic = new Complex(0, 0);
            
            // Voltages (simplified source drop)
            Ua = I012.mul(Rf.scale(3)); // Voltage at fault point
            // For B and C, they remain roughly nominal but shifted by neutral displacement
            // Neutral shift Vn = -I0*Z0
            const Vn = I012.mul(Z0).scale(-1);
            Ub = Va.mul(a2).add(Vn);
            Uc = Va.mul(a).add(Vn);
        }
        else if (simFaultType === 'BC') {
            // 2-Phase (B-C): I1 = -I2 = Vph / (Z1+Z2 + Rf)
            // Ib = -Ic
            const I1 = Va.div(Z1.add(Z2).add(Rf));
            const I2 = I1.scale(-1);
            
            // Convert seq to phase: Ib = a^2*I1 + a*I2 + I0
            Ib = I1.mul(a2).add(I2.mul(a));
            Ic = I1.mul(a).add(I2.mul(a2));
            Ia = new Complex(0, 0);

            // Voltages
            Ua = Va; // Healthy phase
            // Faulted phases collapse towards each other
            Ub = Ub.sub(Ib.mul(Z1)); 
            Uc = Uc.sub(Ic.mul(Z1));
        }

        return { Ia, Ib, Ic, Ua, Ub, Uc };
    }, [simVoltage, simX1, simX0, simR1, simFaultType, simRf]);


    // --- Canvas Drawing Logic (Chart & Vector) ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const vectorCanvasRef = useRef<HTMLCanvasElement>(null);

    // 1. Selectivity Chart Render
    useEffect(() => {
        if (activeTab !== 'chart') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const padding = 50;

        // Clear
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#111827'; 
        ctx.fillRect(0, 0, w, h);

        const maxI = Math.max(curve1Pickup, curve2Enabled ? curve2Pickup : 0) * 10;
        const maxT = Math.max(curve1Time, curve2Enabled ? curve2Time * 10 : 0, 5); 

        // Grid & Axes (Same as before)
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = padding + (i / 10) * (w - 2 * padding);
            ctx.moveTo(x, padding);
            ctx.lineTo(x, h - padding);
            ctx.fillStyle = '#6B7280';
            ctx.font = '10px monospace';
            ctx.fillText(Math.round((i/10)*maxI).toString(), x - 10, h - padding + 15);
        }
        for (let i = 0; i <= 10; i++) {
            const y = h - padding - (i / 10) * (h - 2 * padding);
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.fillStyle = '#6B7280';
            ctx.fillText(((i/10)*maxT).toFixed(1), padding - 30, y + 4);
        }
        ctx.stroke();

        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();
        ctx.fillText("Time (s)", padding + 10, padding + 10);
        ctx.fillText("Current (A)", w - padding - 60, h - padding - 10);

        const drawCurve = (type: CurveType, pickup: number, setting: number, color: string) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const xStart = padding + (pickup / maxI) * (w - 2 * padding);

            if (type === 'Definite') {
                const yTime = h - padding - (setting / maxT) * (h - 2 * padding);
                if (yTime < padding) return;
                ctx.moveTo(xStart, 0);
                ctx.lineTo(xStart, yTime);
                ctx.lineTo(w - padding, yTime);
            } else {
                let k = 0.14; let alpha = 0.02;
                if (type === 'Very Inverse') { k = 13.5; alpha = 1; }
                if (type === 'Extremely Inverse') { k = 80; alpha = 2; }
                ctx.moveTo(xStart, 0);
                for (let i = pickup * 1.01; i <= maxI; i += maxI / 200) {
                    const x = padding + (i / maxI) * (w - 2 * padding);
                    const ratio = i / pickup;
                    const t = (setting * k) / (Math.pow(ratio, alpha) - 1);
                    const y = h - padding - (t / maxT) * (h - 2 * padding);
                    if (y > padding && y < h - padding) ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        };

        drawCurve(curve1Type, curve1Pickup, curve1Time, '#F59E0B'); 
        if (curve2Enabled) drawCurve(curve2Type, curve2Pickup, curve2Time, '#10B981'); 

    }, [activeTab, curve1Type, curve1Pickup, curve1Time, curve2Enabled, curve2Type, curve2Pickup, curve2Time]);

    // 2. Vector Diagram Render
    useEffect(() => {
        if (activeTab !== 'fault') return;
        const canvas = vectorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0b0f19'; 
        ctx.fillRect(0, 0, w, h);

        // Axes
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Scales
        // Max Volt magnitude should fit in circle radius ~180px
        const maxV = Math.max(faultResults.Ua.mag(), faultResults.Ub.mag(), faultResults.Uc.mag(), 1);
        const scaleV = (Math.min(w, h) / 2 - 40) / maxV;
        
        // Max I magnitude
        const maxI = Math.max(faultResults.Ia.mag(), faultResults.Ib.mag(), faultResults.Ic.mag(), 1);
        const scaleI = (Math.min(w, h) / 2 - 40) / maxI;

        // Draw Helper
        const drawVector = (vec: Complex, color: string, label: string, isCurrent: boolean) => {
            const scale = isCurrent ? scaleI : scaleV;
            // Math axes: X right, Y up. Canvas: X right, Y down.
            // Complex (r, i) -> Canvas (cx + r, cy - i)
            const x = cx + vec.r * scale;
            const y = cy - vec.i * scale; // Invert Y for canvas

            ctx.strokeStyle = color;
            ctx.lineWidth = isCurrent ? 3 : 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Arrowhead
            const angle = Math.atan2(cy - y, x - cx);
            const headLen = 10;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y + headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y + headLen * Math.sin(angle + Math.PI / 6));
            ctx.fillStyle = color;
            ctx.fill();

            // Label
            ctx.fillStyle = isCurrent ? color : '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(label, x + 10, y);
        };

        // Draw Voltages (Thin)
        drawVector(faultResults.Ua, '#FBBF24', 'Ua', false); // A - Yellow
        drawVector(faultResults.Ub, '#10B981', 'Ub', false); // B - Green
        drawVector(faultResults.Uc, '#EF4444', 'Uc', false); // C - Red

        // Draw Currents (Thick)
        drawVector(faultResults.Ia, '#FBBF24', 'Ia', true);
        drawVector(faultResults.Ib, '#10B981', 'Ib', true);
        drawVector(faultResults.Ic, '#EF4444', 'Ic', true);

        // Legend
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Scale V: 1px = ${(1/scaleV).toFixed(1)} V`, 10, h - 20);
        ctx.fillText(`Scale I: 1px = ${(1/scaleI).toFixed(1)} A`, 10, h - 10);

    }, [activeTab, faultResults]);


    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-12">
            
            {/* Header with Tabs */}
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <ZapOff className="text-amber-500" size={40} />
                   РЗА Инструментарий
                </h1>
                
                <div className="flex flex-wrap justify-center gap-2">
                    <button 
                        onClick={() => setTab('calc')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'calc' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <Calculator size={16} className="inline mr-2"/> Калькулятор МТЗ
                    </button>
                    <button 
                        onClick={() => setTab('ct')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'ct' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <Activity size={16} className="inline mr-2"/> ТТ (Первичка/Вторичка)
                    </button>
                    <button 
                        onClick={() => setTab('chart')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'chart' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <BarChart3 size={16} className="inline mr-2"/> Карта Селективности
                    </button>
                    <button 
                        onClick={() => setTab('fault')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'fault' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <ShieldAlert size={16} className="inline mr-2"/> Симулятор Аварий
                    </button>
                    <button 
                        onClick={() => setTab('trip_check')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'trip_check' ? 'bg-amber-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <FileCheck size={16} className="inline mr-2"/> Проверка Уставок
                    </button>
                </div>
            </div>

            {/* --- TAB CONTENT --- */}

            {/* TAB 1: CALCULATOR */}
            {activeTab === 'calc' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-gray-800 pb-2">
                            <Settings size={20} className="text-blue-400"/> Входные параметры
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Макс. рабочий ток (I_load)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={loadCurrent} onChange={e => setLoadCurrent(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono" />
                                    <span className="p-3 bg-gray-800 rounded text-gray-400 font-bold">A</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">K отстройки</label>
                                    <input type="number" step="0.1" value={kSafety} onChange={e => setKSafety(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">K возврата</label>
                                    <input type="number" step="0.05" value={kReturn} onChange={e => setKReturn(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">K самозапуска</label>
                                    <input type="number" step="0.1" value={kSelfStart} onChange={e => setKSelfStart(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10"><Calculator size={100} /></div>
                            <h4 className="text-gray-400 text-sm font-bold uppercase mb-2">Расчетная Уставка МТЗ</h4>
                            <div className="text-5xl font-extrabold text-white mb-2">
                                {recommendedPickupPrimary.toFixed(1)} <span className="text-2xl text-gray-500">A</span>
                            </div>
                            <p className="text-xs text-gray-500">Минимальный ток срабатывания защиты на первичной стороне.</p>
                            
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <button 
                                    onClick={() => {
                                        setCurve1Pickup(parseFloat(recommendedPickupPrimary.toFixed(1)));
                                        setTab('chart');
                                    }}
                                    className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-bold transition-colors"
                                >
                                    Применить к графику <ArrowRight size={16}/>
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 text-sm text-gray-400">
                            Формула: <code>I_sz = (K_ots * K_szp / K_vo) * I_load</code>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CT CONVERTER */}
            {activeTab === 'ct' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-gray-800 pb-2">
                            <Activity size={20} className="text-emerald-400"/> Параметры ТТ
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Первичный (I1)</label>
                                    <input type="number" value={ctPrimary} onChange={e => setCtPrimary(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono text-center" />
                                </div>
                                <span className="text-gray-500 text-2xl pt-6">/</span>
                                <div className="w-24">
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Вторичный</label>
                                    <input type="number" value={ctSecondary} onChange={e => setCtSecondary(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono text-center" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Схема соединения вторичных обмоток</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setCtConnection('Star')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${ctConnection === 'Star' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                                    >
                                        <span className="text-lg font-bold">Звезда (Y)</span>
                                        <span className="text-[10px]">I_sec = I_pri / K_tt</span>
                                    </button>
                                    <button 
                                        onClick={() => setCtConnection('Delta')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${ctConnection === 'Delta' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                                    >
                                        <span className="text-lg font-bold">Треугольник (Δ)</span>
                                        <span className="text-[10px]">I_sec = (I_pri / K_tt) * √3</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-1">Ток нагрузки (Первичный)</label>
                                <input type="number" value={loadCurrent} onChange={e => setLoadCurrent(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                            <h4 className="text-gray-400 text-sm font-bold uppercase mb-2">Вторичный ток в реле</h4>
                            <div className="text-5xl font-extrabold text-emerald-400 mb-2">
                                {calculatedSecondaryLoad.toFixed(3)} <span className="text-2xl text-emerald-600/70">A</span>
                            </div>
                            <p className="text-xs text-gray-500">Значение, которое "увидит" терминал.</p>
                        </div>

                        {/* Diagnostics */}
                        <div className="space-y-2">
                            {calculatedSecondaryLoad < 0.05 && (
                                <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded text-xs text-amber-400 flex gap-2">
                                    <AlertTriangle size={16} className="shrink-0"/>
                                    Ток слишком мал (менее 50mA). Возможна погрешность измерений или "мертвая зона".
                                </div>
                            )}
                            {calculatedSecondaryLoad > ctSecondary * 1.2 && (
                                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400 flex gap-2">
                                    <AlertTriangle size={16} className="shrink-0"/>
                                    Ток превышает 120% номинала! Риск насыщения сердечника ТТ и искажения измерений.
                                </div>
                            )}
                            {ctConnection === 'Delta' && (
                                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300 flex gap-2">
                                    <Activity size={16} className="shrink-0"/>
                                    Применена схема "Треугольник". Ток увеличен в √3 ({Math.sqrt(3).toFixed(2)}) раз.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: SELECTIVITY CHART */}
            {activeTab === 'chart' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    
                    {/* Left: Curves Config */}
                    <div className="lg:col-span-4 space-y-4">
                        
                        {/* Curve 1 */}
                        <div className="bg-gray-900 border-l-4 border-amber-500 rounded-r-xl p-4 border-y border-r border-gray-800">
                            <h4 className="text-amber-500 font-bold mb-3 text-sm">Защита 1 (Основная)</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Тип кривой</label>
                                    <select value={curve1Type} onChange={e => setCurve1Type(e.target.value as CurveType)} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white">
                                        <option>Definite</option>
                                        <option>IEC Inverse</option>
                                        <option>Very Inverse</option>
                                        <option>Extremely Inverse</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">I сраб (A)</label>
                                        <input type="number" value={curve1Pickup} onChange={e => setCurve1Pickup(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Время / TMS</label>
                                        <input type="number" step="0.05" value={curve1Time} onChange={e => setCurve1Time(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Curve 2 */}
                        <div className={`bg-gray-900 border-l-4 rounded-r-xl p-4 border-y border-r transition-colors ${curve2Enabled ? 'border-emerald-500 border-gray-800' : 'border-gray-700 opacity-60'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className={`${curve2Enabled ? 'text-emerald-500' : 'text-gray-500'} font-bold text-sm`}>Защита 2 (Резерв)</h4>
                                <input type="checkbox" checked={curve2Enabled} onChange={e => setCurve2Enabled(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer"/>
                            </div>
                            
                            <div className={`space-y-3 ${!curve2Enabled && 'pointer-events-none'}`}>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Тип кривой</label>
                                    <select value={curve2Type} onChange={e => setCurve2Type(e.target.value as CurveType)} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white">
                                        <option>Definite</option>
                                        <option>IEC Inverse</option>
                                        <option>Very Inverse</option>
                                        <option>Extremely Inverse</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">I сраб (A)</label>
                                        <input type="number" value={curve2Pickup} onChange={e => setCurve2Pickup(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Время / TMS</label>
                                        <input type="number" step="0.05" value={curve2Time} onChange={e => setCurve2Time(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right: Chart */}
                    <div className="lg:col-span-8 bg-black/50 border border-gray-800 rounded-xl p-4 overflow-hidden shadow-2xl relative">
                        <canvas 
                            ref={canvasRef} 
                            width={800} 
                            height={500} 
                            className="w-full h-full block"
                        />
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-gray-900/80 px-2 py-1 rounded text-[10px] text-amber-400 border border-amber-500/30">
                                <div className="w-3 h-3 bg-amber-500 rounded-sm"></div> Защита 1
                            </div>
                            {curve2Enabled && (
                                <div className="flex items-center gap-2 bg-gray-900/80 px-2 py-1 rounded text-[10px] text-emerald-400 border border-emerald-500/30">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Защита 2
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: FAULT SIMULATOR */}
            {activeTab === 'fault' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    
                    {/* Left: Input Parameters */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-gray-800 pb-2">
                                <Compass size={20} className="text-red-400"/> Параметры Сети
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-1">U ном (Линейное)</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={simVoltage} onChange={e => setSimVoltage(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                        <span className="p-2 bg-gray-800 rounded text-gray-400 text-sm font-bold">В</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">X1 (Прямая)</label>
                                        <input type="number" value={simX1} onChange={e => setSimX1(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">X0 (Нулевая)</label>
                                        <input type="number" value={simX0} onChange={e => setSimX0(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-1">R1 (Активное)</label>
                                    <input type="number" value={simR1} onChange={e => setSimR1(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-gray-800 pb-2">
                                <ShieldAlert size={20} className="text-amber-400"/> Место повреждения
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Тип КЗ</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['ABC', 'BC', 'AN'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setSimFaultType(t as FaultType)}
                                                className={`py-2 rounded text-xs font-bold border transition-all ${
                                                    simFaultType === t 
                                                    ? 'bg-red-900/30 border-red-500 text-red-400' 
                                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:bg-gray-800'
                                                }`}
                                            >
                                                {t === 'ABC' ? '3-Фазы' : t === 'BC' ? '2-Фазы (BC)' : '1-Фаза (A)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 font-bold uppercase mb-1">R переходное (Rf)</label>
                                    <div className="flex gap-2">
                                        <input type="number" step="0.1" value={simRf} onChange={e => setSimRf(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono" />
                                        <span className="p-2 bg-gray-800 rounded text-gray-400 text-sm font-bold">Ом</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Vector Diagram & Results */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-black/50 border border-gray-800 rounded-xl p-4 shadow-2xl relative min-h-[300px]"> {/* Reduced min-height */}
                            <h4 className="absolute top-4 left-4 text-xs font-bold text-gray-500 uppercase z-10">Векторная Диаграмма (Токи и Напряжения)</h4>
                            <canvas 
                                ref={vectorCanvasRef} 
                                width={600} 
                                height={300} // Reduced height
                                className="w-full h-full block"
                            />
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-950 text-gray-400 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="p-4">Фаза</th>
                                        <th className="p-4 text-center">Ток (I)</th>
                                        <th className="p-4 text-center">Напряжение (U)</th>
                                        <th className="p-4 text-right">Угол (I/U)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-white font-mono">
                                    <tr>
                                        <td className="p-4 text-amber-400 font-bold">A</td>
                                        <td className="p-4 text-center">{faultResults.Ia.mag().toFixed(1)} A</td>
                                        <td className="p-4 text-center">{faultResults.Ua.mag().toFixed(0)} V</td>
                                        <td className="p-4 text-right text-gray-500">{faultResults.Ia.deg().toFixed(0)}° / {faultResults.Ua.deg().toFixed(0)}°</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 text-emerald-400 font-bold">B</td>
                                        <td className="p-4 text-center">{faultResults.Ib.mag().toFixed(1)} A</td>
                                        <td className="p-4 text-center">{faultResults.Ub.mag().toFixed(0)} V</td>
                                        <td className="p-4 text-right text-gray-500">{faultResults.Ib.deg().toFixed(0)}° / {faultResults.Ub.deg().toFixed(0)}°</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 text-red-400 font-bold">C</td>
                                        <td className="p-4 text-center">{faultResults.Ic.mag().toFixed(1)} A</td>
                                        <td className="p-4 text-center">{faultResults.Uc.mag().toFixed(0)} V</td>
                                        <td className="p-4 text-right text-gray-500">{faultResults.Ic.deg().toFixed(0)}° / {faultResults.Uc.deg().toFixed(0)}°</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: TRIP CHECK (NEW) */}
            {activeTab === 'trip_check' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Left: Settings */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg h-fit">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg border-b border-gray-800 pb-2">
                            <Settings size={20} className="text-blue-400"/> Настройки Защиты
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Характеристика (Кривая)</label>
                                <select 
                                    value={tcCurve} 
                                    onChange={e => setTcCurve(e.target.value as CurveType)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white text-sm focus:border-blue-500 outline-none"
                                >
                                    <option value="Definite">Definite Time (Независимая)</option>
                                    <option value="IEC Inverse">IEC Standard Inverse</option>
                                    <option value="Very Inverse">IEC Very Inverse</option>
                                    <option value="Extremely Inverse">IEC Extremely Inverse</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">I сраб (Pickup)</label>
                                    <div className="relative">
                                        <input type="number" value={tcPickup} onChange={e => setTcPickup(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono" />
                                        <span className="absolute right-3 top-3 text-gray-500 text-xs font-bold">A</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">{tcCurve === 'Definite' ? 'Время (T)' : 'Множитель (TMS)'}</label>
                                    <div className="relative">
                                        <input type="number" step="0.01" value={tcTimeSetting} onChange={e => setTcTimeSetting(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white font-mono" />
                                        <span className="absolute right-3 top-3 text-gray-500 text-xs font-bold">s/x</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <label className="block text-sm text-white font-bold mb-2 flex justify-between">
                                    <span>Проверяемый ток (I actual)</span>
                                    <span className="text-amber-400 font-mono">{tcCurrent} A</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={tcPickup * 20} // Dynamic range based on pickup
                                    value={tcCurrent} 
                                    onChange={e => setTcCurrent(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="mt-2">
                                    <input type="number" value={tcCurrent} onChange={e => setTcCurrent(Number(e.target.value))} className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-center" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className={`rounded-xl p-8 border flex flex-col items-center justify-center text-center transition-all duration-300 shadow-2xl relative overflow-hidden ${
                            tripCheckResult.isTrip 
                            ? 'bg-red-900/20 border-red-500/50 shadow-red-900/20' 
                            : 'bg-emerald-900/20 border-emerald-500/50 shadow-emerald-900/20'
                        }`}>
                            <div className={`absolute inset-0 opacity-10 ${tripCheckResult.isTrip ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            
                            <div className="relative z-10 mb-4">
                                {tripCheckResult.isTrip 
                                    ? <XCircle size={64} className="text-red-500 drop-shadow-lg" /> 
                                    : <CheckCircle2 size={64} className="text-emerald-500 drop-shadow-lg" />
                                }
                            </div>
                            
                            <h2 className={`text-4xl font-extrabold mb-2 relative z-10 ${tripCheckResult.isTrip ? 'text-red-400' : 'text-emerald-400'}`}>
                                {tripCheckResult.isTrip ? 'ОТКЛЮЧЕНИЕ' : 'СТАБИЛЬНО'}
                            </h2>
                            
                            <p className="text-gray-400 relative z-10 text-sm">
                                {tripCheckResult.isTrip 
                                    ? `Ток превышает уставку в ${tripCheckResult.multiplicity.toFixed(2)} раз(а)` 
                                    : `Ток ниже порога срабатывания (${tripCheckResult.multiplicity.toFixed(2)} x In)`
                                }
                            </p>
                        </div>

                        {/* Time Display */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Расчетное время (t)</div>
                                <div className="text-3xl font-mono text-white font-bold">
                                    {tripCheckResult.isTrip ? tripCheckResult.time.toFixed(3) : '∞'} <span className="text-lg text-gray-600">сек</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <Timer size={32} className="text-gray-600 inline-block mb-1"/>
                                <div className="text-[10px] text-gray-500 font-mono">
                                    {tripCheckResult.isTrip ? `${(tripCheckResult.time * 1000).toFixed(0)} ms` : '--'}
                                </div>
                            </div>
                        </div>

                        {/* Info / Formula */}
                        <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 text-xs text-gray-400 leading-relaxed">
                            <strong className="text-gray-300 block mb-1">Алгоритм:</strong>
                            {tcCurve === 'Definite' ? (
                                <span>Независимая выдержка: если I {'>'} I_set, то t = T_set. Ток не влияет на время.</span>
                            ) : (
                                <span>
                                    Зависимая выдержка (IEC 60255): чем больше ток, тем быстрее отключение. 
                                    <br/>Формула: <code>t = TMS * k / ((I/Is)^α - 1)</code>
                                </span>
                            )}
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
};