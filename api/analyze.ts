import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './utils/encryption.js';
import { GoogleGenAI } from "@google/genai";

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization Header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid Token' });
        }

        const {
            fileData,   // Base64 string (no data: prefix ideally, or we strip it)
            mimeType,   // "application/pdf" or "image/png"
            prompt,
            model,      // "gemini-1.5-flash", "gpt-4o", etc.
            provider    // "gemini", "openai", "anthropic"
        } = req.body;

        if (!fileData || !mimeType || !prompt || !provider) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Fetch encrypted keys
        const { data: settings, error: dbError } = await supabaseAdmin
            .from('user_ai_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (dbError || !settings) {
            return res.status(404).json({ error: 'AI Settings not found. Please save your API keys first.' });
        }

        let apiKey = '';
        try {
            if (provider === 'gemini' && settings.gemini_api_key) apiKey = decrypt(settings.gemini_api_key);
            else if (provider === 'openai' && settings.openai_api_key) apiKey = decrypt(settings.openai_api_key);
            else if (provider === 'anthropic' && settings.anthropic_api_key) apiKey = decrypt(settings.anthropic_api_key);
            else if (provider === 'custom' && settings.custom_api_key) apiKey = decrypt(settings.custom_api_key);
        } catch (e) {
            console.error('Decryption failed', e);
            return res.status(500).json({ error: 'Failed to decrypt API key on server' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: `No API key found for provider: ${provider}` });
        }

        // --- AI LOGIC ---
        let resultText = "";

        if (provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            // For Gemini 1.5, we use models.generateContent
            // It supports PDF via inline data if small enough, or File API.
            // Assuming Base64 inline for now (limit < 20MB)
            const response = await ai.models.generateContent({
                model: model || 'gemini-1.5-flash',
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: mimeType, data: fileData } }
                    ]
                }
            });
            resultText = response.text || "";

        } else if (provider === 'openai') {
            // OpenAI Vision (GPT-4o)
            // Does NOT support PDF directly via image_url usually, only Images.
            // If user sends PDF to OpenAI, it might fail unless we convert to image server-side.
            // For now, assuming Frontend blocks PDF for OpenAI as per original code.

            const dataUrl = `data:${mimeType};base64,${fileData}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o',
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'OpenAI API Error');
            }
            const data = await response.json();
            resultText = data.choices[0]?.message?.content || "";

        } else if (provider === 'anthropic') {
            // Claude Vision
            // Supports base64 images. Not PDF directly in 'image' block usually.

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: mimeType,
                                        data: fileData,
                                    },
                                },
                                { type: "text", text: prompt }
                            ],
                        }
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Anthropic API Error');
            }
            const data = await response.json();
            // Anthropic returns content array
            if (Array.isArray(data.content)) {
                resultText = data.content.map((c: any) => c.text).join('');
            } else {
                resultText = "";
            }
        } else {
            return res.status(400).json({ error: 'Unsupported provider for analysis' });
        }

        return res.status(200).json({ text: resultText });

    } catch (err: any) {
        console.error('Analyze API Error:', err);
        return res.status(500).json({ error: 'Analysis failed', details: err.message });
    }
}

export default allowCors(handler);
