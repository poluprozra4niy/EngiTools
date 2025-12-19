import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Ensure we can use standard imports
      }
    },
    optimizeDeps: {
      include: ['@google/genai', '@supabase/supabase-js', 'exceljs']
    },
    // Убеждаемся, что переменные окружения доступны
    define: {
      // Vite автоматически обрабатывает переменные с префиксом VITE_
      // Но мы можем явно определить их здесь, если нужно
    }
  };
});