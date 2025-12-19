import { createClient } from '@supabase/supabase-js';

let supabaseUrl = '';
let supabaseAnonKey = '';

// 1. Try accessing via import.meta.env (Vite)
try {
  // Cast to any to avoid TS errors if types aren't set up
  const meta = import.meta as any;
  if (meta && meta.env) {
    supabaseUrl = meta.env.VITE_SUPABASE_URL;
    supabaseAnonKey = meta.env.VITE_SUPABASE_ANON_KEY;
  }
} catch (e) {
  console.debug('Error reading import.meta.env', e);
}

// 2. Fallback to process.env (Node/Webpack) if values are missing
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

if (!isSupabaseConfigured) {
  console.warn('Supabase URL/Key missing or invalid. App running in Offline Mode.');
  console.log('Current URL:', supabaseUrl ? 'Set (Invalid)' : 'Missing');
} else {
  console.log('Supabase Configured:', supabaseUrl);
}

// Create client with fallback to avoid crash during initialization
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