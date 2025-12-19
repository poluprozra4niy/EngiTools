
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, User, Lock, Mail, Save, Loader2, LogOut, CheckCircle, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  
  // Password Change State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState({ text: '', type: '' as 'success' | 'error' });
  const [isPassLoading, setIsPassLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
      navigate('/login');
      return null;
  }

  // Handle Avatar Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setIsLoading(true);
        await updateProfile({ avatar: base64String });
        setIsLoading(false);
      };

      if (file.size > 2 * 1024 * 1024) {
          alert("Файл слишком большой! Максимум 2МБ.");
          return;
      }
      
      reader.readAsDataURL(file);
    }
  };

  // Handle Name Update
  const handleUpdateName = async () => {
      setIsLoading(true);
      await updateProfile({ username: displayName });
      setIsLoading(false);
      setIsEditing(false);
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPassMessage({ text: '', type: 'success' });
      setIsPassLoading(true);

      try {
          await changePassword(oldPass, newPass);
          setPassMessage({ text: 'Пароль успешно обновлен!', type: 'success' });
          setOldPass('');
          setNewPass('');
      } catch (err: any) {
          setPassMessage({ text: err.message, type: 'error' });
      } finally {
          setIsPassLoading(false);
      }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Avatar & Basic Info */}
            <div className="lg:col-span-1">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center sticky top-24">
                    
                    {/* Avatar Circle */}
                    <div className="relative group mb-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 bg-gray-800 shadow-lg">
                            {user.avatar ? (
                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-gray-400">
                                    <User size={64} />
                                </div>
                            )}
                        </div>
                        {/* Upload Overlay */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                        >
                            <Camera size={24} />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                <Loader2 className="animate-spin text-white" size={32} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1">{user.username}</h2>
                    <p className="text-gray-500 text-sm mb-4">{user.email}</p>
                    <div className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 mb-6">
                        {user.role}
                    </div>

                    <button 
                        onClick={() => {
                            logout();
                            navigate('/');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-900/20 text-gray-300 hover:text-red-400 py-2 rounded-lg transition-colors text-sm font-medium border border-gray-700 hover:border-red-500/30"
                    >
                        <LogOut size={16} /> Выйти из аккаунта
                    </button>
                </div>
            </div>

            {/* Right Column: Settings */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Personal Info Edit */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <User size={20} className="text-blue-500"/> Личные данные
                        </h3>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-sm text-blue-400 hover:text-blue-300">
                                Изменить
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Имя (отображаемое)</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    disabled={!isEditing}
                                    className={`w-full bg-gray-950 border rounded-xl py-3 px-4 text-white outline-none transition-all ${
                                        isEditing ? 'border-blue-500 focus:ring-1 focus:ring-blue-500' : 'border-gray-800 text-gray-400'
                                    }`}
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Логин)</label>
                            <div className="relative opacity-70">
                                <Mail className="absolute left-3 top-3.5 text-gray-500" size={18}/>
                                <input 
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-10 px-4 text-gray-400 outline-none cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-gray-600 mt-1">Email нельзя изменить</p>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex gap-3 mt-6 justify-end animate-fade-in">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                                Отмена
                            </button>
                            <button 
                                onClick={handleUpdateName}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                                Сохранить
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Security */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                     <h3 className="text-white font-bold flex items-center gap-2 mb-6">
                        <Shield size={20} className="text-purple-500"/> Безопасность
                    </h3>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {passMessage.text && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                                passMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                                {passMessage.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                                {passMessage.text}
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Старый пароль</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-500" size={16}/>
                                    <input 
                                        type="password"
                                        value={oldPass}
                                        onChange={(e) => setOldPass(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-9 pr-4 text-white focus:border-purple-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый пароль</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-500" size={16}/>
                                    <input 
                                        type="password"
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl py-2.5 pl-9 pr-4 text-white focus:border-purple-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit"
                                disabled={isPassLoading || !oldPass || !newPass}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
                            >
                                {isPassLoading ? <Loader2 className="animate-spin" size={16}/> : <Lock size={16}/>}
                                Обновить пароль
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    </div>
  );
};
