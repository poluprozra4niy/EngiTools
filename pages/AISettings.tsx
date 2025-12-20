import React, { useState, useEffect } from 'react';
import { useAIConfig } from '../context/AIConfigContext';
import { useAuth } from '../context/AuthContext';
import { Brain, Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, Sparkles, Settings, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AISettings: React.FC = () => {
  const { config, models, updateConfig, getCurrentModel, isConfigured } = useAIConfig();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [localConfig, setLocalConfig] = useState(config);
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    openai: false,
    anthropic: false,
    custom: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      console.log('[AISettings] Saving config:', {
        ...localConfig,
        geminiApiKey: localConfig.geminiApiKey ? `${localConfig.geminiApiKey.substring(0, 8)}...` : 'empty',
        openaiApiKey: localConfig.openaiApiKey ? `${localConfig.openaiApiKey.substring(0, 8)}...` : 'empty',
      });
      
      await updateConfig(localConfig);
      
      setSaveMessage({ text: 'Настройки успешно сохранены! Перезагрузите страницу или попробуйте использовать AI снова.', type: 'success' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('[AISettings] Save error:', error);
      setSaveMessage({ text: error.message || 'Ошибка при сохранении настроек', type: 'error' });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const currentModel = getCurrentModel();

  const maskKey = (key: string, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    return key.length > 8 ? `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}` : '•'.repeat(key.length);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-800">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Brain size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Настройки AI</h1>
            <p className="text-gray-400">Управление API ключами и выбор моделей искусственного интеллекта</p>
          </div>
        </div>

        {/* Status Card */}
        <div className={`mb-6 p-4 rounded-xl border ${isConfigured ? 'bg-green-900/20 border-green-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle size={20} className="text-green-500" />
                <div>
                  <p className="text-green-400 font-bold">AI настроен и готов к работе</p>
                  <p className="text-green-300/70 text-sm mt-1">
                    Используется модель: <span className="font-mono">{currentModel?.name || config.selectedModel}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="text-amber-500" />
                <div>
                  <p className="text-amber-400 font-bold">Требуется настройка API ключей</p>
                  <p className="text-amber-300/70 text-sm mt-1">
                    Добавьте API ключ для выбранной модели, чтобы использовать AI функции
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-xl border ${
            saveMessage.type === 'success' 
              ? 'bg-green-900/20 border-green-500/30 text-green-400' 
              : 'bg-red-900/20 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {saveMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <p>{saveMessage.text}</p>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-400 uppercase mb-3">
            <Sparkles size={16} className="inline mr-2" />
            Выбор модели AI
          </label>
          <select
            value={localConfig.selectedModel}
            onChange={(e) => setLocalConfig({ ...localConfig, selectedModel: e.target.value })}
            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.description ? `- ${model.description}` : ''}
              </option>
            ))}
          </select>
          {currentModel && (
            <p className="mt-2 text-xs text-gray-500">
              Провайдер: <span className="font-mono text-purple-400">{currentModel.provider.toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* API Keys Section */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Key size={20} />
            API Ключи
          </h2>

          {/* Gemini API Key */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase">
                Gemini API Key
              </label>
              <button
                onClick={() => setShowKeys({ ...showKeys, gemini: !showKeys.gemini })}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showKeys.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showKeys.gemini ? 'text' : 'password'}
              value={localConfig.geminiApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, geminiApiKey: e.target.value })}
              placeholder="Введите ваш Gemini API ключ"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Получите ключ на <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>
            </p>
          </div>

          {/* OpenAI API Key */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase">
                OpenAI API Key
              </label>
              <button
                onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showKeys.openai ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showKeys.openai ? 'text' : 'password'}
              value={localConfig.openaiApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, openaiApiKey: e.target.value })}
              placeholder="Введите ваш OpenAI API ключ"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Получите ключ на <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">OpenAI Platform</a>
            </p>
          </div>

          {/* Anthropic API Key */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase">
                Anthropic (Claude) API Key
              </label>
              <button
                onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showKeys.anthropic ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showKeys.anthropic ? 'text' : 'password'}
              value={localConfig.anthropicApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, anthropicApiKey: e.target.value })}
              placeholder="Введите ваш Anthropic API ключ"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Получите ключ на <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Anthropic Console</a>
            </p>
          </div>

          {/* Custom API */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase">
                Custom API (Опционально)
              </label>
              <button
                onClick={() => setShowKeys({ ...showKeys, custom: !showKeys.custom })}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showKeys.custom ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showKeys.custom ? 'text' : 'password'}
              value={localConfig.customApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, customApiKey: e.target.value })}
              placeholder="Введите кастомный API ключ"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none mb-3"
            />
            <input
              type="text"
              value={localConfig.customApiUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, customApiUrl: e.target.value })}
              placeholder="URL кастомного API (если требуется)"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Info size={12} />
              Для использования кастомных API провайдеров
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-300/90">
              <p className="font-bold mb-1">Безопасность</p>
              <p className="text-blue-300/70">
                Все API ключи шифруются и хранятся локально в вашем браузере. 
                При авторизации они также синхронизируются с вашим аккаунтом в зашифрованном виде.
                Никто, кроме вас, не имеет доступа к вашим ключам.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Settings className="animate-spin" size={20} />
              Сохранение...
            </>
          ) : (
            <>
              <Save size={20} />
              Сохранить настройки
            </>
          )}
        </button>
      </div>
    </div>
  );
};

