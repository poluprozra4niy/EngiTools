import React, { useState, useRef, useEffect } from 'react';
import { 
    Maximize, Minimize, Move, Layers, Eye, EyeOff, 
    MousePointer2, Upload, File, X, Grid as GridIcon,
    Settings, ZoomIn, ZoomOut, RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import { parseDxfContent, CadData, CadEntity } from '../utils/simpleDxfParser';

interface Layer {
    id: string;
    name: string;
    color: string;
    visible: boolean;
}

export const DwgViewer: React.FC = () => {
    // State
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Viewport State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Pan offset
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [activeTool, setActiveTool] = useState<'PAN' | 'SELECT'>('PAN');
    const [showGrid, setShowGrid] = useState(true);
    
    // Data State
    const [layers, setLayers] = useState<Layer[]>([]);
    const [cadData, setCadData] = useState<CadData | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null); // For direct .svg files

    const containerRef = useRef<HTMLDivElement>(null);

    // --- Actions ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileName(file.name);
            setIsLoading(true);
            setError(null);
            setCadData(null);
            setSvgContent(null);

            const reader = new FileReader();
            
            reader.onload = (ev) => {
                try {
                    const content = ev.target?.result as string;
                    
                    if (file.name.toLowerCase().endsWith('.dxf')) {
                        // Parse DXF
                        const parsed = parseDxfContent(content);
                        setCadData(parsed);
                        
                        // Extract Layers
                        const newLayers = parsed.layers.map((l, i) => ({
                            id: l,
                            name: l,
                            color: getColorForLayer(l, i),
                            visible: true
                        }));
                        setLayers(newLayers);
                        
                        // Fit to screen
                        fitToScreen(parsed.extents);
                    } 
                    else if (file.name.toLowerCase().endsWith('.svg')) {
                        // Display SVG directly
                        setSvgContent(content);
                        // Reset layers for SVG (simple toggle all?)
                        setLayers([{ id: 'all', name: 'SVG Layer', color: '#FFF', visible: true }]);
                        setScale(1);
                        setPosition({ x: 0, y: 0 });
                    }
                    else {
                        throw new Error("Формат не поддерживается. Используйте DXF или SVG.");
                    }
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || "Ошибка чтения файла");
                } finally {
                    setIsLoading(false);
                }
            };

            reader.onerror = () => {
                setError("Ошибка чтения файла");
                setIsLoading(false);
            };

            reader.readAsText(file);
        }
    };

    const fitToScreen = (extents: { min: {x:number, y:number}, max: {x:number, y:number} }) => {
        if (!containerRef.current) return;
        
        const padding = 50;
        const viewW = containerRef.current.clientWidth - padding * 2;
        const viewH = containerRef.current.clientHeight - padding * 2;
        
        const dataW = extents.max.x - extents.min.x;
        const dataH = extents.max.y - extents.min.y;
        
        if (dataW === 0 || dataH === 0) return;

        const scaleX = viewW / dataW;
        const scaleY = viewH / dataH;
        const newScale = Math.min(scaleX, scaleY); // Fit both
        
        // DXF coordinates are usually huge, need to flip Y and center
        // Center of data
        const centerX = extents.min.x + dataW / 2;
        const centerY = extents.min.y + dataH / 2;
        
        // Center of view
        const viewCX = containerRef.current.clientWidth / 2;
        const viewCY = containerRef.current.clientHeight / 2;

        setScale(newScale);
        // Translate logic: We need (0,0) of data to move such that Center is at ViewCenter
        // And we need to flip Y (done in render transform)
        // Position here represents the translation applied BEFORE scaling usually in SVG matrix logic,
        // but here we apply translate then scale in transform string order for easy pan:
        // transform={`translate(${position.x},${position.y}) scale(${scale} -${scale})`}
        // Wait, to flip properly we usually do scale(s, -s).
        
        // Let's set position to center the content
        setPosition({
            x: viewCX - centerX * newScale,
            y: viewCY + centerY * newScale // + because we flip Y with scale(1, -1)
        });
    };

    const getColorForLayer = (layerName: string, index: number) => {
        // Simple distinct colors for layers if they don't have explicit colors
        const colors = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#F87171'];
        return colors[index % colors.length];
    };

    const toggleLayer = (id: string) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = 1 - e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.01, scale * delta), 1000);
        
        // Zoom towards mouse pointer logic could go here, 
        // simple center zoom for now
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'PAN') {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && activeTool === 'PAN') {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const resetView = () => {
        if (cadData) {
            fitToScreen(cadData.extents);
        } else {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    // --- Render Logic ---

    // Generate Path Data for a Polyline
    const getPolylinePath = (points: {x:number, y:number}[], closed: boolean) => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        if (closed) d += ' Z';
        return d;
    };

    // Helper to calculate Arc path (DXF angles are CCW from X-axis)
    const getArcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
        // Convert deg to rad
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        
        // Large arc flag
        let diff = endAngle - startAngle;
        if (diff < 0) diff += 360;
        const largeArc = diff > 180 ? 1 : 0;
        
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const renderEntities = () => {
        if (!cadData) return null;

        return cadData.entities.map((ent, idx) => {
            // Check layer visibility
            const layerObj = layers.find(l => l.name === ent.layer);
            if (layerObj && !layerObj.visible) return null;

            const color = ent.color || layerObj?.color || '#FFF';
            const strokeWidth = 1 / scale; // Keep lines thin regardless of zoom

            switch(ent.type) {
                case 'LINE':
                    return <line key={idx} x1={ent.x1} y1={ent.y1} x2={ent.x2} y2={ent.y2} stroke={color} strokeWidth={strokeWidth} />;
                case 'LWPOLYLINE':
                    return <path key={idx} d={getPolylinePath(ent.points || [], ent.closed || false)} stroke={color} fill="none" strokeWidth={strokeWidth} />;
                case 'CIRCLE':
                    return <circle key={idx} cx={ent.cx} cy={ent.cy} r={ent.r} stroke={color} fill="none" strokeWidth={strokeWidth} />;
                case 'ARC':
                    if (ent.cx !== undefined && ent.cy !== undefined && ent.r !== undefined && ent.startAngle !== undefined && ent.endAngle !== undefined) {
                        return <path key={idx} d={getArcPath(ent.cx, ent.cy, ent.r, ent.startAngle, ent.endAngle)} stroke={color} fill="none" strokeWidth={strokeWidth} />;
                    }
                    return null;
                case 'TEXT':
                case 'MTEXT':
                    return (
                        <text 
                            key={idx} 
                            x={ent.x1} 
                            y={ent.y1} 
                            fill={color} 
                            fontSize={ent.height || 10} 
                            transform={`scale(1, -1) translate(0, -${(ent.y1 || 0)*2})`} // Fix text flipping due to global scale(1,-1)
                            // Actually, simpler to just unflip the text locally if we flip global Y
                            // But here we are inside a group that is scaled 1, -1. 
                            // Text will be mirrored upside down. 
                            // To fix: scale(1, -1) around the insertion point.
                        >
                            <tspan style={{ transform: `scale(1, -1)` }}>{ent.text}</tspan> 
                            {/* SVG Text handling with transforms is tricky. 
                                Easier hack: Just render text as is, user can read upside down? 
                                No, let's try to flip it back.
                            */}
                        </text>
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div className="animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            {/* Toolbar */}
            <div className="bg-gray-900 border-b border-gray-800 p-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <File className="text-blue-500"/> CAD Viewer <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">Live Parser</span>
                    </h1>
                    <div className="h-8 w-px bg-gray-700 mx-2"></div>
                    <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm border border-gray-700">
                        <Upload size={16}/>
                        {fileName || "Открыть DXF / SVG"}
                        <input type="file" accept=".dxf,.svg" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>

                <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button 
                        onClick={() => setActiveTool('PAN')}
                        className={`p-2 rounded ${activeTool === 'PAN' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        title="Панорамирование"
                    >
                        <Move size={18}/>
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-1"></div>
                    <button onClick={() => setScale(s => s * 1.2)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><ZoomIn size={18}/></button>
                    <button onClick={() => setScale(s => s / 1.2)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><ZoomOut size={18}/></button>
                    <button onClick={resetView} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Показать всё"><RefreshCw size={18}/></button>
                    <div className="w-px h-6 bg-gray-700 mx-1"></div>
                    <button 
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 rounded ${showGrid ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        <GridIcon size={18}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Layer Control Panel */}
                <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10 shrink-0">
                    <div className="p-4 border-b border-gray-800 font-bold text-gray-300 flex items-center gap-2">
                        <Layers size={16}/> Слои ({layers.length})
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {layers.length === 0 && (
                            <div className="text-xs text-gray-500 text-center py-4 italic">Нет слоев</div>
                        )}
                        {layers.map(layer => (
                            <button 
                                key={layer.id}
                                onClick={() => toggleLayer(layer.id)}
                                className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-800 transition-colors group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }}></div>
                                    <span className={`text-sm truncate ${layer.visible ? 'text-gray-200' : 'text-gray-500 line-through decoration-gray-600'}`}>
                                        {layer.name}
                                    </span>
                                </div>
                                <div className={`text-gray-500 ${layer.visible ? 'group-hover:text-white' : ''} shrink-0 ml-2`}>
                                    {layer.visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    {cadData && (
                        <div className="p-4 border-t border-gray-800 bg-gray-950 text-xs text-gray-500 space-y-1">
                            <div>Entities: {cadData.entities.length}</div>
                            <div>Bounds: {Math.round(cadData.extents.max.x - cadData.extents.min.x)} x {Math.round(cadData.extents.max.y - cadData.extents.min.y)}</div>
                        </div>
                    )}
                </div>

                {/* Canvas Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 bg-[#111] relative overflow-hidden cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    style={{
                        backgroundImage: showGrid ? 'radial-gradient(#333 1px, transparent 1px)' : 'none',
                        backgroundSize: `${20 * scale}px ${20 * scale}px`,
                        backgroundPosition: `${position.x}px ${position.y}px`
                    }}
                >
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                            <div className="text-white flex flex-col items-center gap-3">
                                <Loader2 size={40} className="animate-spin text-blue-500"/>
                                <span>Парсинг файла...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-red-900/80 border border-red-500 text-white p-6 rounded-xl flex flex-col items-center gap-2 max-w-md text-center">
                                <AlertCircle size={32} className="text-red-400"/>
                                <h3 className="font-bold text-lg">Ошибка</h3>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Content Rendering */}
                    <div style={{ width: '100%', height: '100%' }}>
                        {svgContent ? (
                            // Direct SVG Render (for .svg files)
                            <div 
                                className="w-full h-full pointer-events-none origin-top-left"
                                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
                                dangerouslySetInnerHTML={{ __html: svgContent }} 
                            />
                        ) : (
                            // DXF Vector Render
                            <svg className="w-full h-full pointer-events-none overflow-visible">
                                {/* DXF Y is up, SVG Y is down. We flip Y with scale(1, -1) */}
                                <g transform={`translate(${position.x},${position.y}) scale(${scale}, -${scale})`}>
                                    {renderEntities()}
                                    
                                    {/* Mock Demo if empty */}
                                    {!cadData && !fileName && (
                                        <g transform="scale(1, -1)"> {/* Unflip for demo text */}
                                            <text x="0" y="0" fill="#333" fontSize="20" textAnchor="middle">
                                                Загрузите .DXF файл для просмотра
                                            </text>
                                        </g>
                                    )}
                                </g>
                            </svg>
                        )}
                    </div>

                    {!fileName && !isLoading && (
                        <div className="absolute bottom-8 right-8 bg-gray-900/80 backdrop-blur border border-gray-700 p-4 rounded-xl max-w-sm pointer-events-none animate-fade-in">
                            <h4 className="text-white font-bold mb-1">Режим просмотра</h4>
                            <p className="text-xs text-gray-400">
                                Поддерживаются форматы <b>.DXF</b> (ASCII) и <b>.SVG</b>.
                                <br/>
                                <span className="text-emerald-400">Работает оффлайн в браузере.</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
