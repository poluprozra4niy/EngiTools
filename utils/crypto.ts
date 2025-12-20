import CryptoJS from 'crypto-js';

// Используем ключ из переменных окружения или дефолтный (с предупреждением в консоли)
// В продакшене обязательно должен быть задан VITE_APP_SECRET
const SECRET_KEY = import.meta.env.VITE_APP_SECRET || 'dev-secret-key-do-not-use-in-prod';

if (!import.meta.env.VITE_APP_SECRET) {
    console.warn('[Crypto] VITE_APP_SECRET not found. Using insecure default key.');
}

/**
 * Шифрует строку с использованием AES
 */
export const encryptData = (data: string): string => {
    if (!data) return '';
    try {
        return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
    } catch (e) {
        console.error('[Crypto] Encryption failed:', e);
        return '';
    }
};

/**
 * Дешифрует строку с использованием AES
 */
export const decryptData = (ciphertext: string): string => {
    if (!ciphertext) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (e) {
        console.error('[Crypto] Decryption failed:', e);
        return '';
    }
};
