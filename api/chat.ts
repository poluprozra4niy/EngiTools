import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './utils/encryption.js';
import { GoogleGenAI } from "@google/genai";

// Initialize Supabase Client (Admin context)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const allowCors = (fn: any) => async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid Token' });
    }

    const { messages, model, systemPrompt, provider } = req.body;

    if (!messages || !model || !provider) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Fetch encrypted keys from DB
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

    // --- AI LOGIC PROXY ---

    try {
        // 1. Gemini
        if (provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            const lastMessage = messages[messages.length - 1];
            const history = messages.slice(0, -1).filter((m: any) => m.role !== 'system').map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            const chat = ai.chats.create({
                model: model,
                config: { systemInstruction: systemPrompt || '' },
                history: history,
            });

            const result = await chat.sendMessageStream({ message: lastMessage.content });

            // Vercel streaming response
            // Using standard pipe logic or just writing chunks
            // For simple Node.js response:
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Transfer-Encoding', 'chunked');

            for await (const chunk of result) {
                if (chunk.text) {
                    res.write(chunk.text);
                }
            }
            res.end();
            return;
        }

        // 2. OpenAI
        if (provider === 'openai') {
            const formattedMessages = messages.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }));
            if (systemPrompt) formattedMessages.unshift({ role: 'system', content: systemPrompt });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: formattedMessages, stream: true })
            });

            if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
            if (!response.body) throw new Error('No response body');

            // Pipe the fetch stream to the response
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            // Node requires manual piping from web stream (fetch) to writable stream (res)
            // Or we can iterate it
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));
                for (const line of lines) {
                    if (line === 'data: [DONE]') continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        if (content) res.write(content);
                    } catch (e) { }
                }
            }
            res.end();
            return;
        }

        // 3. Anthropic
        if (provider === 'anthropic') {
            const formattedMessages = messages.filter((m: any) => m.role !== 'system').map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }));

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    messages: formattedMessages,
                    system: systemPrompt || '',
                    max_tokens: 4096,
                    stream: true
                })
            });

            if (!response.ok) throw new Error('Anthropic API error');

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));
                for (const line of lines) {
                    if (line === 'data: [DONE]') continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'content_block_delta') {
                            const content = data.delta?.text;
                            if (content) res.write(content);
                        }
                    } catch (e) { }
                }
            }
            res.end();
            return;
        }

        return res.status(400).json({ error: 'Unsupported provider' });

    } catch (err: any) {
        console.error('AI Proxy Error:', err);
        res.status(500).json({ error: 'AI Gateway Error', details: err.message });
    }
}

export default allowCors(handler);
