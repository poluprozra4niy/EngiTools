import React, { useState } from 'react';
import { Download, Plus, Trash2, FileSpreadsheet, Columns, Server, X, Eraser, RotateCcw, AlertTriangle } from 'lucide-react';
import { cleanDecimal, cleanHex } from '../utils/converterUtils';
import ExcelJS from 'exceljs';

interface CustomColumn {
    id: string;
    name: string;
}

interface MapRow {
    id: number;
    deviceId: string;
    addrDec: string;
    addrHex: string;
    name: string;
    type: 'Holding' | 'Input' | 'Coil' | 'Discrete';
    access: 'RW' | 'RO' | 'WO'; // Added Access field
    dataType: 'UINT16' | 'INT16' | 'UINT32' | 'INT32' | 'FLOAT' | 'BIT';
    description: string;
    customFields: Record<string, string>;
}

// Confirmation State Interface
interface ConfirmState {
    isOpen: boolean;
    type: 'RESET_TABLE' | 'CLEAR_COLS' | 'DELETE_COL' | null;
    targetId?: string; // Used when deleting a specific column
}

export const ModbusMap: React.FC = () => {
    const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
    
    // Unified Confirmation Modal State
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        type: null
    });

    const [newColName, setNewColName] = useState("");
    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
    const [rowsToAdd, setRowsToAdd] = useState<number>(1);
    
    const [rows, setRows] = useState<MapRow[]>([
        { 
            id: 1, 
            deviceId: 'Sensor_01', 
            addrDec: '40001', 
            addrHex: '9C41', 
            name: 'Control Word', 
            type: 'Holding', 
            access: 'RW',
            dataType: 'UINT16', 
            description: 'System control',
            customFields: {}
        }
    ]);

    // --- Actions Execution ---

    const executeAction = () => {
        if (confirmState.type === 'RESET_TABLE') {
            setRows([{ 
                id: 1, 
                deviceId: '', 
                addrDec: '', 
                addrHex: '', 
                name: '', 
                type: 'Holding', 
                access: 'RW',
                dataType: 'UINT16', 
                description: '',
                customFields: {}
            }]);
        } else if (confirmState.type === 'CLEAR_COLS') {
            setCustomColumns([]);
        } else if (confirmState.type === 'DELETE_COL' && confirmState.targetId) {
            setCustomColumns(prev => prev.filter(c => c.id !== confirmState.targetId));
        }
        
        // Close modal
        setConfirmState({ isOpen: false, type: null, targetId: undefined });
    };

    // --- Row Operations ---

    const handleAddRows = () => {
        const count = Math.max(1, rowsToAdd);
        let currentMaxId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) : 0;
        const newRows: MapRow[] = [];

        for (let i = 0; i < count; i++) {
            currentMaxId++;
            newRows.push({
                id: currentMaxId,
                deviceId: '',
                addrDec: '',
                addrHex: '',
                name: '',
                type: 'Holding',
                access: 'RW',
                dataType: 'UINT16',
                description: '',
                customFields: {}
            });
        }
        
        setRows(prev => [...prev, ...newRows]);
    };

    const deleteRow = (id: number) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const updateRow = (id: number, field: keyof MapRow, value: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Special handler for Type change to auto-update Access
    const handleTypeChange = (id: number, newType: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                let newAccess: 'RW' | 'RO' = 'RW';
                if (newType === 'Input' || newType === 'Discrete') {
                    newAccess = 'RO';
                }
                return { ...r, type: newType, access: newAccess };
            }
            return r;
        }));
    };

    const updateCustomField = (rowId: number, colId: string, value: string) => {
        setRows(prev => prev.map(r => {
            if (r.id === rowId) {
                return {
                    ...r,
                    customFields: {
                        ...r.customFields,
                        [colId]: value
                    }
                };
            }
            return r;
        }));
    };

    const handleAddressChange = (id: number, mode: 'DEC' | 'HEX', value: string) => {
        let dec = '';
        let hex = '';

        if (mode === 'DEC') {
            dec = cleanDecimal(value);
            if (dec && dec !== '-') {
                try {
                    hex = BigInt(dec).toString(16).toUpperCase();
                } catch (e) { hex = ''; }
            }
        } else {
            hex = cleanHex(value);
            if (hex) {
                try {
                    dec = BigInt('0x' + hex).toString();
                } catch (e) { dec = ''; }
            }
        }

        setRows(prev => prev.map(r => r.id === id ? { ...r, addrDec: dec, addrHex: hex } : r));
    };

    // --- Column Operations ---

    const openAddColumnModal = () => {
        setNewColName("");
        setIsAddColModalOpen(true);
    };

    const handleAddColumn = () => {
        if (!newColName.trim()) return;
        const id = `col_${Date.now()}`;
        setCustomColumns(prev => [...prev, { id, name: newColName.trim() }]);
        setIsAddColModalOpen(false);
    };

    // Request Handlers (Trigger Modals)
    const requestResetTable = () => setConfirmState({ isOpen: true, type: 'RESET_TABLE' });
    const requestClearColumns = () => setConfirmState({ isOpen: true, type: 'CLEAR_COLS' });
    const requestDeleteColumn = (id: string) => setConfirmState({ isOpen: true, type: 'DELETE_COL', targetId: id });

    // --- Export ---

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Modbus Map');

            // 1. Explicitly Define Columns
            // This ensures we can control width and keys correctly
            worksheet.columns = [
                { header: 'Устройство', key: 'deviceId', width: 20 },
                { header: 'Адрес (DEC)', key: 'addrDec', width: 15 },
                { header: 'Адрес (HEX)', key: 'addrHex', width: 15 },
                { header: 'Имя', key: 'name', width: 30 },
                { header: 'Тип рег.', key: 'type', width: 15 },
                { header: 'Доступ', key: 'access', width: 12 }, // Added column
                { header: 'Тип данных', key: 'dataType', width: 15 },
                { header: 'Описание', key: 'description', width: 40 },
                ...customColumns.map(c => ({ header: c.name, key: c.id, width: 20 }))
            ];

            // 2. Add Data Rows
            rows.forEach(row => {
                const rowData: any = {
                    deviceId: row.deviceId,
                    addrDec: row.addrDec,
                    addrHex: row.addrHex,
                    name: row.name,
                    type: row.type,
                    access: row.access, // Map access
                    dataType: row.dataType,
                    description: row.description
                };
                
                // Flatten custom fields into the row object
                if (row.customFields) {
                    Object.keys(row.customFields).forEach(key => {
                        rowData[key] = row.customFields[key];
                    });
                }
                
                worksheet.addRow(rowData);
            });

            // 3. Styling & Borders
            // We explicitely loop through all defined columns to ensure borders are applied
            // even if the cell is empty or was dynamically added.
            const totalColumns = worksheet.columns.length;

            worksheet.eachRow((row, rowNumber) => {
                for (let i = 1; i <= totalColumns; i++) {
                    const cell = row.getCell(i);
                    
                    // Apply thin border to every cell
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    if (rowNumber === 1) {
                        // Header specific styling
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF374151' } // Dark Gray (Tailwind gray-700)
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else {
                        // Data specific styling
                        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                    }
                }
            });

            // 4. Auto-width Calculation
            // We iterate through columns to find the max length content
            worksheet.columns.forEach((column) => {
                let maxLen = 0;
                
                // Account for header length
                if (column.header) {
                     maxLen = column.header.toString().length;
                }
                
                // Check all cells in this column
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const val = cell.value ? cell.value.toString() : '';
                        if (val.length > maxLen) maxLen = val.length;
                    });
                }
                
                // Set width with padding (min 12, max 60 chars)
                column.width = Math.min(Math.max(maxLen + 2, 12), 60);
            });

            // 5. Generate and Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "modbus_map.xlsx";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Excel generation failed:", error);
            alert("Ошибка при создании Excel файла. Проверьте консоль.");
        }
    };

    return (
        <div className="animate-fade-in pb-12 relative">
             <div className="text-center space-y-4 mb-10">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
                   <FileSpreadsheet className="text-accent-500" size={40} />
                   Карта Регистров
                </h1>
                <p className="text-gray-400 text-lg">
                    Создайте таблицу регистров, добавьте свои поля и экспортируйте в Excel
                </p>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                 {/* Left Side: Addition Controls */}
                 <div className="flex flex-wrap gap-2">
                    <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <input
                            type="number"
                            min="1"
                            max="500"
                            value={rowsToAdd}
                            onChange={(e) => setRowsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-gray-900/50 text-white text-center py-2 outline-none border-r border-gray-700 text-sm h-full"
                            title="Количество строк для добавления"
                        />
                        <button 
                            type="button"
                            onClick={handleAddRows} 
                            className="flex items-center gap-2 hover:bg-gray-700 text-white px-4 py-2 transition-colors"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Строк(и)</span>
                        </button>
                    </div>

                    <button type="button" onClick={openAddColumnModal} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700">
                        <Columns size={16} /> <span className="hidden sm:inline">Столбец</span>
                    </button>
                 </div>

                 {/* Right Side: Reset & Export */}
                 <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
                     <button 
                        type="button"
                        onClick={requestResetTable} 
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                     >
                        <RotateCcw size={16} /> 
                        <span className="hidden md:inline">Сброс таблицы</span>
                     </button>
                     
                     {customColumns.length > 0 && (
                        <button 
                            type="button"
                            onClick={requestClearColumns} 
                            className="flex items-center gap-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-orange-500/30"
                        >
                            <Eraser size={16} />
                            <span className="hidden md:inline">Удалить столбцы</span>
                        </button>
                     )}

                    <div className="w-px h-8 bg-gray-700 mx-2 hidden md:block"></div>

                    <button type="button" onClick={downloadExcel} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-600/20">
                        <Download size={16} /> Экспорт
                    </button>
                 </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-gray-950 text-gray-400 text-sm uppercase">
                            <th className="p-4 border-b border-gray-800 min-w-[150px]">
                                <div className="flex items-center gap-2"><Server size={14}/> Устройство</div>
                            </th>
                            <th className="p-4 border-b border-gray-800 w-28 text-emerald-500">Addr (DEC)</th>
                            <th className="p-4 border-b border-gray-800 w-24 text-blue-500">Addr (HEX)</th>
                            <th className="p-4 border-b border-gray-800 min-w-[180px]">Имя</th>
                            <th className="p-4 border-b border-gray-800 w-32">Тип рег.</th>
                            <th className="p-4 border-b border-gray-800 w-28">Доступ</th>
                            <th className="p-4 border-b border-gray-800 w-32">Тип данных</th>
                            <th className="p-4 border-b border-gray-800 min-w-[200px]">Описание</th>
                            {/* Custom Columns Header */}
                            {customColumns.map(col => (
                                <th key={col.id} className="p-4 border-b border-gray-800 min-w-[150px] relative group/th">
                                    <div className="flex items-center justify-between text-accent-400 gap-2">
                                        <span className="truncate" title={col.name}>{col.name}</span>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                requestDeleteColumn(col.id);
                                            }}
                                            className="text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded p-1 transition-colors cursor-pointer z-10"
                                            title="Удалить этот столбец"
                                        >
                                            <X size={16}/>
                                        </button>
                                    </div>
                                </th>
                            ))}
                            <th className="p-4 border-b border-gray-800 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {rows.map(row => (
                            <tr key={row.id} className="hover:bg-gray-800/30 group transition-colors">
                                <td className="p-2">
                                    <input value={row.deviceId} onChange={e => updateRow(row.id, 'deviceId', e.target.value)} 
                                        className="w-full bg-transparent text-white outline-none border-b border-transparent focus:border-accent-500 px-2 py-1" placeholder="Device..." />
                                </td>
                                <td className="p-2">
                                    <input value={row.addrDec} onChange={e => handleAddressChange(row.id, 'DEC', e.target.value)} 
                                        className="w-full bg-gray-800/50 text-emerald-400 font-mono outline-none rounded border border-transparent focus:border-emerald-500 px-2 py-1 text-center" placeholder="0" />
                                </td>
                                <td className="p-2">
                                    <input value={row.addrHex} onChange={e => handleAddressChange(row.id, 'HEX', e.target.value)} 
                                        className="w-full bg-gray-800/50 text-blue-400 font-mono outline-none rounded border border-transparent focus:border-blue-500 px-2 py-1 text-center uppercase" placeholder="0" />
                                </td>
                                <td className="p-2">
                                    <input value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} 
                                        className="w-full bg-transparent text-white outline-none border-b border-transparent focus:border-accent-500 px-2 py-1" placeholder="Name..." />
                                </td>
                                <td className="p-2">
                                    <select value={row.type} onChange={e => handleTypeChange(row.id, e.target.value)} 
                                        className="w-full bg-gray-900 text-gray-300 text-sm outline-none rounded p-1 border border-gray-800 focus:border-gray-600">
                                        <option>Holding</option>
                                        <option>Input</option>
                                        <option>Coil</option>
                                        <option>Discrete</option>
                                    </select>
                                </td>
                                <td className="p-2">
                                     <select value={row.access} onChange={e => updateRow(row.id, 'access', e.target.value)} 
                                        className={`w-full bg-gray-900 text-sm outline-none rounded p-1 border border-gray-800 focus:border-gray-600 font-medium ${
                                            row.access === 'RO' ? 'text-orange-400' : 'text-emerald-400'
                                        }`}>
                                        <option value="RW">R/W</option>
                                        <option value="RO">R Only</option>
                                        <option value="WO">W Only</option>
                                    </select>
                                </td>
                                <td className="p-2">
                                     <select value={row.dataType} onChange={e => updateRow(row.id, 'dataType', e.target.value)} 
                                        className="w-full bg-gray-900 text-amber-400 font-mono text-sm outline-none rounded p-1 border border-gray-800 focus:border-gray-600">
                                        <option>UINT16</option>
                                        <option>INT16</option>
                                        <option>UINT32</option>
                                        <option>INT32</option>
                                        <option>FLOAT</option>
                                        <option>BIT</option>
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} 
                                        className="w-full bg-transparent text-gray-400 text-sm outline-none border-b border-transparent focus:border-accent-500 px-2 py-1" placeholder="..." />
                                </td>
                                
                                {/* Custom Columns Inputs */}
                                {customColumns.map(col => (
                                    <td key={col.id} className="p-2">
                                         <input 
                                            value={(row.customFields && row.customFields[col.id]) ? row.customFields[col.id] : ''} 
                                            onChange={e => updateCustomField(row.id, col.id, e.target.value)} 
                                            className="w-full bg-transparent text-gray-300 text-sm outline-none border-b border-transparent focus:border-accent-500 px-2 py-1" 
                                            placeholder="..." 
                                        />
                                    </td>
                                ))}

                                <td className="p-2 text-center">
                                    <button type="button" onClick={() => deleteRow(row.id)} className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {rows.length === 0 && (
                <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-xl mt-4 bg-gray-900/30">
                    <p className="mb-2">Таблица пуста</p>
                    <button onClick={handleAddRows} className="text-accent-500 hover:underline">Добавить первую строку</button>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* 1. Add Column Modal */}
            {isAddColModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-xl font-bold text-white">Новый столбец</h3>
                             <button type="button" onClick={() => setIsAddColModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <input 
                            autoFocus
                            value={newColName}
                            onChange={e => setNewColName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                            placeholder="Название (например: Единицы)"
                            className="w-full bg-gray-950 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-accent-500 mb-6 placeholder-gray-600"
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAddColModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Отмена</button>
                            <button type="button" onClick={handleAddColumn} className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-lg transition-colors font-medium">
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Unified Confirmation Modal */}
            {confirmState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Вы уверены?</h3>
                        <p className="text-gray-400 mb-6">
                            {confirmState.type === 'RESET_TABLE' && "Это действие удалит все данные и сбросит таблицу к одной пустой строке."}
                            {confirmState.type === 'CLEAR_COLS' && "Это удалит ВСЕ пользовательские столбцы и данные в них."}
                            {confirmState.type === 'DELETE_COL' && "Этот столбец и данные в нем будут удалены безвозвратно."}
                        </p>
                        
                        <div className="flex gap-3 justify-center">
                            <button 
                                type="button" 
                                onClick={() => setConfirmState({ isOpen: false, type: null })} 
                                className="px-5 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button 
                                type="button" 
                                onClick={executeAction} 
                                className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 font-medium"
                            >
                                Да, удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};