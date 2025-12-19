
// Types for our internal CAD representation
export interface CadEntity {
    id: number;
    type: 'LINE' | 'LWPOLYLINE' | 'CIRCLE' | 'ARC' | 'TEXT' | 'MTEXT';
    layer: string;
    color?: string;
    // Geometry props
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    points?: {x: number, y: number}[];
    cx?: number; cy?: number; r?: number;
    startAngle?: number; endAngle?: number;
    text?: string; height?: number;
    closed?: boolean;
}

export interface CadData {
    entities: CadEntity[];
    layers: string[];
    extents: {
        min: {x: number, y: number};
        max: {x: number, y: number};
    };
}

// AutoCAD Color Index (ACI) to Hex mapping (Basic)
const ACI_COLORS: Record<number, string> = {
    1: '#EF4444', // Red
    2: '#EAB308', // Yellow
    3: '#22C55E', // Green
    4: '#06B6D4', // Cyan
    5: '#3B82F6', // Blue
    6: '#D946EF', // Magenta
    7: '#FFFFFF', // White/Black
    8: '#9CA3AF', // Gray
    9: '#E5E7EB', // Light Gray
};

export const parseDxfContent = (text: string): CadData => {
    const lines = text.split(/\r?\n/);
    const entities: CadEntity[] = [];
    const layers = new Set<string>();
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    const updateBounds = (x: number, y: number) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    };

    let section = '';
    let currentEntity: any = null;
    let i = 0;

    // Helper to get next value
    const next = () => lines[++i]?.trim();

    while (i < lines.length) {
        const code = lines[i]?.trim();
        const value = next();

        if (code === '0' && value === 'SECTION') {
            const nextCode = lines[++i]?.trim();
            section = next();
        } else if (code === '0' && value === 'ENDSEC') {
            section = '';
        }

        if (section === 'ENTITIES') {
            if (code === '0') {
                // Push previous entity if exists
                if (currentEntity) {
                    // Post-process polyline to points array if needed
                    entities.push(currentEntity as CadEntity);
                }
                
                // Start new entity
                if (['LINE', 'LWPOLYLINE', 'CIRCLE', 'ARC', 'TEXT', 'MTEXT'].includes(value || '')) {
                    currentEntity = { id: i, type: value, layer: '0', points: [] };
                } else {
                    currentEntity = null;
                }
            } else if (currentEntity) {
                // Parse properties based on Group Code
                switch (code) {
                    case '8': // Layer Name
                        currentEntity.layer = value || '0';
                        layers.add(currentEntity.layer);
                        break;
                    case '62': // Color
                        const aci = parseInt(value || '7');
                        currentEntity.color = ACI_COLORS[aci] || '#FFFFFF';
                        break;
                    // Coordinates
                    case '10': currentEntity.x1 = parseFloat(value || '0'); currentEntity.cx = currentEntity.x1; 
                               if(currentEntity.type === 'TEXT' || currentEntity.type === 'MTEXT') updateBounds(currentEntity.x1, 0); // Text bounds approx
                               break;
                    case '20': currentEntity.y1 = parseFloat(value || '0'); currentEntity.cy = currentEntity.y1; break;
                    case '11': currentEntity.x2 = parseFloat(value || '0'); break;
                    case '21': currentEntity.y2 = parseFloat(value || '0'); 
                               if (currentEntity.type === 'LINE') {
                                   updateBounds(currentEntity.x1, currentEntity.y1);
                                   updateBounds(currentEntity.x2, currentEntity.y2);
                               }
                               break;
                    // Circle/Arc
                    case '40': currentEntity.r = parseFloat(value || '0'); currentEntity.height = currentEntity.r; 
                               if (currentEntity.type === 'CIRCLE') {
                                   updateBounds(currentEntity.cx - currentEntity.r, currentEntity.cy - currentEntity.r);
                                   updateBounds(currentEntity.cx + currentEntity.r, currentEntity.cy + currentEntity.r);
                               }
                               break;
                    case '50': currentEntity.startAngle = parseFloat(value || '0'); break;
                    case '51': currentEntity.endAngle = parseFloat(value || '0'); break;
                    // Text
                    case '1': currentEntity.text = value || ''; break;
                    // Polyline Vertices
                    // DXF LwPolyline is tricky in line-stream, strictly simpler here:
                    // 10/20 pairs appear multiple times. We need to catch them.
                }
                
                // Special handling for Polyline vertices which repeat code 10/20
                if (currentEntity.type === 'LWPOLYLINE') {
                    if (code === '10') {
                        currentEntity._lastX = parseFloat(value || '0');
                    } else if (code === '20') {
                        const x = currentEntity._lastX;
                        const y = parseFloat(value || '0');
                        currentEntity.points.push({x, y});
                        updateBounds(x, y);
                    } else if (code === '70') {
                        // Flag 1 = closed
                        currentEntity.closed = (parseInt(value || '0') & 1) === 1;
                    }
                }
            }
        }
        
        i++;
    }
    // Push last
    if (currentEntity) entities.push(currentEntity);

    // Default bounds if empty
    if (minX === Infinity) { minX = 0; maxX = 100; minY = 0; maxY = 100; }

    return {
        entities,
        layers: Array.from(layers).sort(),
        extents: { min: {x: minX, y: minY}, max: {x: maxX, y: maxY} }
    };
};
