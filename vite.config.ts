import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure we can use standard imports
    }
  },
  optimizeDeps: {
    include: ['@google/genai', '@supabase/supabase-js', 'exceljs']
  }
});