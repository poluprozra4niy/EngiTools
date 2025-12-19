export const cleanHex = (input: string): string => {
  return input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
};

export const cleanDecimal = (input: string): string => {
  let cleaned = input.replace(/[^0-9-]/g, '');
  if (cleaned.indexOf('-') > 0) {
    cleaned = cleaned.replace(/-/g, '');
  }
  if ((cleaned.match(/-/g) || []).length > 1) {
     const hasMinus = cleaned.startsWith('-');
     cleaned = cleaned.replace(/-/g, '');
     if (hasMinus) cleaned = '-' + cleaned;
  }
  return cleaned;
};

export const formatHex = (hex: string): string => {
  return hex.replace(/(.{2})(?=.)/g, '$1 ').trim();
};

export const hexToDecimal = (hex: string): string => {
  if (!hex) return '';
  try {
    return BigInt('0x' + hex).toString();
  } catch (e) {
    return 'Ошибка';
  }
};

export const decimalToHex = (dec: string): string => {
  if (!dec || dec === '-') return '';
  try {
    const val = BigInt(dec);
    if (val < 0) {
      return '-' + (-val).toString(16).toUpperCase();
    }
    return val.toString(16).toUpperCase();
  } catch (e) {
    return 'Ошибка';
  }
};

export const decimalToTwosComplement = (dec: string, bits: number): string | null => {
  if (!dec || dec === '-') return null;
  try {
    let val = BigInt(dec);
    const min = -(BigInt(1) << (BigInt(bits) - BigInt(1)));
    const max = (BigInt(1) << (BigInt(bits) - BigInt(1))) - BigInt(1);

    if (val < min || val > max) return null;

    if (val < 0) {
       val = (BigInt(1) << BigInt(bits)) + val;
    }
    return val.toString(16).toUpperCase().padStart(bits / 4, '0');
  } catch (e) {
    return null;
  }
};

export const hexToSignedDecimal = (hex: string, bits: number = 32): string => {
  if (!hex) return '';
  try {
    let val = BigInt('0x' + hex);
    const bitBig = BigInt(bits);
    const limit = BigInt(1) << bitBig;
    
    if (val >= limit) {
       return val.toString() + ` (> ${bits} бит)`;
    }

    if (val >= (BigInt(1) << (bitBig - BigInt(1)))) {
        val = val - limit;
    }
    return val.toString();
  } catch (e) {
    return 'Ошибка';
  }
};

export const hexToBinary = (hex: string): string => {
  if (!hex) return '';
  try {
    const bigInt = BigInt('0x' + hex);
    return bigInt.toString(2).padStart(hex.length * 4, '0');
  } catch (e) {
    return '';
  }
};

export const hexToRegisters = (hex: string): number[] => {
  if (!hex) return [];
  const paddedHex = hex.length % 4 !== 0 ? hex.padStart(hex.length + (4 - hex.length % 4), '0') : hex;
  const registers: number[] = [];
  
  for (let i = 0; i < paddedHex.length; i += 4) {
    const chunk = paddedHex.substring(i, i + 4);
    registers.push(parseInt(chunk, 16));
  }
  return registers;
};

// --- Modbus Specific Utils ---

export const calculateModbusCRC = (buffer: number[]): number => {
  let crc = 0xFFFF;
  for (let pos = 0; pos < buffer.length; pos++) {
    crc ^= buffer[pos];
    for (let i = 8; i !== 0; i--) {
      if ((crc & 0x0001) !== 0) {
        crc >>= 1;
        crc ^= 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
};

export const numToHex2 = (num: number): string => {
    return num.toString(16).toUpperCase().padStart(2, '0');
};

export const numToHex4 = (num: number): string => {
    return num.toString(16).toUpperCase().padStart(4, '0');
};

// --- Advanced 32-bit Logic ---

export enum ByteOrder {
  ABCD = 'ABCD (Big Endian)',
  CDAB = 'CDAB (Word Swap / Little Endian)',
  BADC = 'BADC (Byte Swap)',
  DCBA = 'DCBA (True Little Endian)'
}

export interface Decoded32 {
  uint32: number;
  int32: number;
  float: number | string;
  hex: string;
}

export const decode32Bit = (reg1: number, reg2: number, order: ByteOrder): Decoded32 => {
  // Normalize inputs to 16-bit
  const r1 = reg1 & 0xFFFF;
  const r2 = reg2 & 0xFFFF;

  const b1 = (r1 >> 8) & 0xFF;
  const b2 = r1 & 0xFF;
  const b3 = (r2 >> 8) & 0xFF;
  const b4 = r2 & 0xFF;

  let finalBytes: number[] = [];

  switch (order) {
    case ByteOrder.ABCD: finalBytes = [b1, b2, b3, b4]; break;
    case ByteOrder.CDAB: finalBytes = [b3, b4, b1, b2]; break;
    case ByteOrder.BADC: finalBytes = [b2, b1, b4, b3]; break;
    case ByteOrder.DCBA: finalBytes = [b4, b3, b2, b1]; break;
  }

  // Combine to integer
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  // Fill DataView (Big Endian filling)
  finalBytes.forEach((b, i) => view.setUint8(i, b));
  
  const uint32 = view.getUint32(0, false); // Read as Big Endian
  const int32 = view.getInt32(0, false);
  const floatVal = view.getFloat32(0, false);

  return {
    uint32,
    int32,
    float: isNaN(floatVal) ? "NaN" : floatVal,
    hex: finalBytes.map(b => numToHex2(b)).join('')
  };
};

// --- Scaling ---

export const scaleValue = (raw: number, rawLow: number, rawHigh: number, engLow: number, engHigh: number): number => {
  if (rawHigh === rawLow) return 0;
  return ((raw - rawLow) * (engHigh - engLow)) / (rawHigh - rawLow) + engLow;
};
