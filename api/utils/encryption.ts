import crypto from 'crypto';

// The secret key should be 32 bytes for AES-256
// We'll fallback to a dev key if not provided (ONLY FOR DEV!)
const ALGORITHM = 'aes-256-gcm';
const SERVER_SECRET = process.env.SERVER_SECRET || 'dev-secret-key-32-bytes-long-!!';

// Ensure the key is 32 bytes. If the env var is short/long, we hash it to fit.
const getKey = () => {
    return crypto.createHash('sha256').update(String(SERVER_SECRET)).digest();
};

export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: IV:AuthTag:EncryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (text: string): string => {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
