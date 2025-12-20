import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from './utils/encryption.js';

// Initialize Supabase Client (Admin context to write protected data)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const allowCors = (fn: any) => async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization Header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify User
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid Token' });
    }

    const {
        geminiApiKey,
        openaiApiKey,
        anthropicApiKey,
        customApiKey,
        customApiUrl,
        selectedModel,
        defaultProvider
    } = req.body;

    try {
        // Encrypt sensitive keys
        const encryptedData = {
            user_id: user.id,
            gemini_api_key: geminiApiKey ? encrypt(geminiApiKey) : null,
            openai_api_key: openaiApiKey ? encrypt(openaiApiKey) : null,
            anthropic_api_key: anthropicApiKey ? encrypt(anthropicApiKey) : null,
            custom_api_key: customApiKey ? encrypt(customApiKey) : null,
            custom_api_url: customApiUrl,
            selected_model: selectedModel,
            default_provider: defaultProvider,
            updated_at: new Date().toISOString(),
        };

        // Upsert to Database
        const { error: dbError } = await supabaseAdmin
            .from('user_ai_settings')
            .upsert(encryptedData, { onConflict: 'user_id' });

        if (dbError) {
            console.error('Database Error:', dbError);
            return res.status(500).json({ error: 'Failed to save settings' });
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('Encryption/Handler Error:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
}

export default allowCors(handler);
