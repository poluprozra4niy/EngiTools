import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface AIModel {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  description?: string;
}

export interface AIConfig {
  geminiApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  customApiKey: string;
  customApiUrl: string;
  selectedModel: string;
  defaultProvider: 'gemini' | 'openai' | 'anthropic' | 'custom';
}

interface AIConfigContextType {
  config: AIConfig;
  models: AIModel[];
  updateConfig: (updates: Partial<AIConfig>) => Promise<void>;
  getApiKey: (provider: 'gemini' | 'openai' | 'anthropic' | 'custom') => string;
  getCurrentModel: () => AIModel | undefined;
  isConfigured: boolean;
}

const defaultConfig: AIConfig = {
  geminiApiKey: '',
  openaiApiKey: '',
  anthropicApiKey: '',
  customApiKey: '',
  customApiUrl: '',
  selectedModel: 'gemini-3-flash-preview',
  defaultProvider: 'gemini',
};

// Доступные модели
const defaultModels: AIModel[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Preview)', provider: 'gemini', description: 'Быстрая модель для общих задач' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'gemini', description: 'Экспериментальная версия' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', description: 'Мощная модель для сложных задач' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', description: 'Быстрая и эффективная модель' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'OpenAI GPT-4 Optimized' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', description: 'OpenAI GPT-4 Turbo' },
  { id: 'gpt-5.2', name: 'Chat GPT 5.2', provider: 'openai', description: 'Next Gen AI Model' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'OpenAI GPT-3.5 Turbo' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', description: 'Anthropic Claude 3.5 Sonnet (Latest)' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Anthropic Claude 3 Opus' },
];

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export const useAIConfig = () => {
  const context = useContext(AIConfigContext);
  if (!context) throw new Error('useAIConfig must be used within an AIConfigProvider');
  return context;
};

export const AIConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [models] = useState<AIModel[]>(defaultModels);

  // Загрузка конфигурации при монтировании
  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConfig = async () => {
    try {
      let loadedConfig = { ...defaultConfig };

      // Сначала пробуем загрузить из localStorage (для быстрого доступа)
      const localConfig = localStorage.getItem('ai_config');
      if (localConfig) {
        try {
          const parsed = JSON.parse(localConfig);
          loadedConfig = { ...defaultConfig, ...parsed };
        } catch (e) {
          console.error('Failed to parse local AI config:', e);
        }
      }

      // Если пользователь авторизован, пробуем загрузить из Supabase (приоритет над localStorage)
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_ai_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && data) {
            loadedConfig = {
              geminiApiKey: data.gemini_api_key || '',
              openaiApiKey: data.openai_api_key || '',
              anthropicApiKey: data.anthropic_api_key || '',
              customApiKey: data.custom_api_key || '',
              customApiUrl: data.custom_api_url || '',
              selectedModel: data.selected_model || defaultConfig.selectedModel,
              defaultProvider: data.default_provider || defaultConfig.defaultProvider,
            };
            // Сохраняем в localStorage для быстрого доступа
            localStorage.setItem('ai_config', JSON.stringify(loadedConfig));
          }
        } catch (dbError) {
          console.warn('Failed to load from Supabase (table might not exist):', dbError);
          // Продолжаем с localStorage конфигом
        }
      }

      // Fallback: пробуем загрузить из переменных окружения
      if (!loadedConfig.geminiApiKey) {
        const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
        if (envKey) {
          loadedConfig.geminiApiKey = envKey;
        }
      }

      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const updateConfig = async (updates: Partial<AIConfig>) => {
    // Используем функциональное обновление для получения актуального состояния
    return new Promise<void>((resolve) => {
      setConfig(prevConfig => {
        const newConfig = { ...prevConfig, ...updates };

        console.log('[AIConfig] Updating config:', {
          updates,
          newConfig: {
            ...newConfig,
            geminiApiKey: newConfig.geminiApiKey ? `${newConfig.geminiApiKey.substring(0, 8)}...` : 'empty',
          }
        });

        // Сохраняем в localStorage синхронно
        localStorage.setItem('ai_config', JSON.stringify(newConfig));
        console.log('[AIConfig] Saved to localStorage');

        // Если пользователь авторизован, сохраняем в Supabase асинхронно
        if (user) {
          supabase
            .from('user_ai_settings')
            .upsert({
              user_id: user.id,
              gemini_api_key: newConfig.geminiApiKey,
              openai_api_key: newConfig.openaiApiKey,
              anthropic_api_key: newConfig.anthropicApiKey,
              custom_api_key: newConfig.customApiKey,
              custom_api_url: newConfig.customApiUrl,
              selected_model: newConfig.selectedModel,
              default_provider: newConfig.defaultProvider,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
            .then(({ error }) => {
              if (error) {
                console.error('[AIConfig] Failed to save AI config to database:', error);
              } else {
                console.log('[AIConfig] Saved to database successfully');
              }
              resolve();
            })
            .catch((error) => {
              console.error('[AIConfig] Error saving AI config:', error);
              resolve(); // Разрешаем промис даже при ошибке
            });
        } else {
          resolve(); // Если пользователь не авторизован, сразу разрешаем
        }

        return newConfig;
      });
    });
  };

  const getApiKey = (provider: 'gemini' | 'openai' | 'anthropic' | 'custom'): string => {
    switch (provider) {
      case 'gemini':
        return config.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
      case 'openai':
        return config.openaiApiKey || '';
      case 'anthropic':
        return config.anthropicApiKey || '';
      case 'custom':
        return config.customApiKey || '';
      default:
        return '';
    }
  };

  const getCurrentModel = (): AIModel | undefined => {
    const model = models.find(m => m.id === config.selectedModel);
    console.log('[AIConfig] getCurrentModel:', {
      selectedModel: config.selectedModel,
      found: !!model,
      modelName: model?.name
    });
    return model;
  };

  // Вычисляем isConfigured на основе текущего config
  const isConfiguredValue = React.useMemo(() => {
    const model = models.find(m => m.id === config.selectedModel);
    if (!model) {
      console.log('[AIConfig] isConfigured: false (no model found)');
      return false;
    }
    const apiKey = (() => {
      switch (model.provider) {
        case 'gemini':
          return config.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
        case 'openai':
          return config.openaiApiKey || '';
        case 'anthropic':
          return config.anthropicApiKey || '';
        case 'custom':
          return config.customApiKey || '';
        default:
          return '';
      }
    })();
    const configured = !!apiKey;
    console.log('[AIConfig] isConfigured:', configured, `(model: ${model.name}, provider: ${model.provider}, hasKey: ${!!apiKey})`);
    return configured;
  }, [config.selectedModel, config.geminiApiKey, config.openaiApiKey, config.anthropicApiKey, config.customApiKey, models]);

  return (
    <AIConfigContext.Provider
      value={{
        config,
        models,
        updateConfig,
        getApiKey,
        getCurrentModel,
        isConfigured: isConfiguredValue,
      }}
    >
      {children}
    </AIConfigContext.Provider>
  );
};

