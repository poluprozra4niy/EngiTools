import { createClient } from '@supabase/supabase-js';

let supabaseUrl = '';
let supabaseAnonKey = '';

// 1. Try accessing via import.meta.env (Vite standard)
try {
  if (import.meta.env) {
    // Отладочное логирование
    console.log('[DEBUG] import.meta.env keys:', Object.keys(import.meta.env));
    console.log('[DEBUG] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('[DEBUG] VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }
} catch (e) {
  console.debug('Error reading import.meta.env', e);
}

// 2. Fallback to process.env (Node/Webpack/Some Containers)
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    if (typeof process !== 'undefined' && process.env) {
      supabaseUrl = supabaseUrl || process.env.VITE_SUPABASE_URL;
      supabaseAnonKey = supabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch (e) {
    console.debug('Error reading process.env', e);
  }
}

// 3. Validation
const isValidUrl = (url: string) => {
  try {
    return url && url.startsWith('https://') && !url.includes('placeholder');
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;

// Logging for Developer Console
if (!isSupabaseConfigured) {
  console.warn('--- ENGITOOLS CONFIGURATION WARNING ---');
  console.warn('Supabase URL or Key is missing.');
  console.warn('1. Check if .env file exists in project root.');
  console.warn('2. Check if variables start with VITE_ (e.g. VITE_SUPABASE_URL).');
  console.warn('3. Restart the dev server.');
  console.log('Current URL found:', supabaseUrl || '(Empty)');
} else {
  console.log('EngiTools: Supabase configured successfully.');
}

// Create client with fallback to avoid crash during initialization
// If not configured, we use a dummy URL so the app can render the error UI instead of crashing white screen
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);