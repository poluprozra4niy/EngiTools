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
    if (!user) {
      setConfig(defaultConfig);
    } else {
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConfig = async () => {
    try {
      let loadedConfig = { ...defaultConfig };

      // Если пользователь авторизован, загружаем статус ключей из Supabase
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_ai_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && data) {
            // МЫ НЕ ПОЛУЧАЕМ РЕАЛЬНЫЕ КЛЮЧИ! Они зашифрованы на сервере.
            // Мы просто ставим заглушки, чтобы UI знал, что ключи есть.
            loadedConfig = {
              geminiApiKey: data.gemini_api_key ? '********' : '',
              openaiApiKey: data.openai_api_key ? '********' : '',
              anthropicApiKey: data.anthropic_api_key ? '********' : '',
              customApiKey: data.custom_api_key ? '********' : '',
              customApiUrl: data.custom_api_url || '',
              selectedModel: data.selected_model || defaultConfig.selectedModel,
              defaultProvider: data.default_provider || defaultConfig.defaultProvider,
            };
          }
        } catch (dbError) {
          console.warn('Failed to load from Supabase:', dbError);
        }
      }

      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const updateConfig = async (updates: Partial<AIConfig>) => {
    return new Promise<void>((resolve, reject) => {
      setConfig(prevConfig => {
        const newConfig = { ...prevConfig, ...updates };

        // Если пользователь авторизован, отправляем ключи на СЕРВЕР для шифрования и сохранения
        if (user) {
          // Получаем текущую сессию для токена
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.access_token) return;

            fetch('/api/save-keys', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                // Отправляем ключи, только если они не являются заглушками
                geminiApiKey: newConfig.geminiApiKey !== '********' ? newConfig.geminiApiKey : undefined,
                openaiApiKey: newConfig.openaiApiKey !== '********' ? newConfig.openaiApiKey : undefined,
                anthropicApiKey: newConfig.anthropicApiKey !== '********' ? newConfig.anthropicApiKey : undefined,
                customApiKey: newConfig.customApiKey !== '********' ? newConfig.customApiKey : undefined,
                customApiUrl: newConfig.customApiUrl,
                selectedModel: newConfig.selectedModel,
                defaultProvider: newConfig.defaultProvider
              })
            })
              .then(res => {
                if (!res.ok) throw new Error('Failed to save settings to server');
                console.log('[AIConfig] Saved to server successfully');
                resolve();
              })
              .catch(err => {
                console.error('[AIConfig] Server save error:', err);
                // Не реджектим, чтобы не ломать UI, но логируем
                resolve();
              });
          });
        } else {
          resolve();
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

