import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, BookOpen, Hammer, TableProperties, Activity, 
  Search, FileJson, Stethoscope, Zap, FileText, Cable, Network, FileCode,
  User, LogIn, LogOut, Settings, ChevronDown, Map, ShieldAlert, ZapOff,
  PenTool, CloudOff, Cloud
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, connectionError } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'bg-gray-800 text-white shadow-inner'
        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
    }`;

  const profibusLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'bg-purple-900/40 text-purple-100 shadow-inner border border-purple-500/30'
        : 'text-gray-400 hover:text-purple-300 hover:bg-gray-800/50'
    }`;

  const gooseLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      isActive 
      ? 'bg-emerald-900/40 text-emerald-100 shadow-inner border border-emerald-500/30' 
      : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800/50'
    }`;

  const rzaLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
      isActive 
      ? 'bg-amber-900/40 text-amber-100 shadow-inner border border-amber-500/30' 
      : 'text-gray-400 hover:text-amber-400 hover:bg-gray-800/50'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-auto md:h-16 flex flex-col md:flex-row items-center justify-between py-2 md:py-0">
        
        {/* Brand - Links to Landing Page */}
        <div className="flex w-full md:w-auto justify-between items-center mb-2 md:mb-0">
            <div className="flex items-center gap-3">
              <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                  <Zap size={20} fill="currentColor" className="opacity-90" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Engi<span className="text-emerald-500">Tools</span>
                </span>
              </NavLink>
              
              {/* Connection Status Indicator */}
              {connectionError ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 ml-2 animate-pulse" title="Нет связи с базой данных. Данные сохраняются только в браузере.">
                   <CloudOff size={12} /> DEMO MODE
                </div>
              ) : null}
            </div>
        </div>

        {/* Navigation Groups - Only visible if logged in */}
        {user && (
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide md:mx-4">
            
            {/* Modbus Group */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  <NavLink to="/modbus/converter" className={linkClass} title="Hex/Dec Converter">
                    <Calculator size={16} />
                  </NavLink>
                  <NavLink to="/builder" className={linkClass} title="Modbus Builder">
                    <Hammer size={16} />
                  </NavLink>
                  <NavLink to="/map" className={linkClass} title="Register Map">
                    <TableProperties size={16} />
                  </NavLink>
                  <NavLink to="/monitor" className={linkClass} title="Live Monitor">
                    <Activity size={16} />
                  </NavLink>
                  <NavLink to="/modbus" className={linkClass} title="Modbus Wiki">
                    <BookOpen size={16} />
                  </NavLink>
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-800"></div>

            {/* PROFIBUS Group */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  <NavLink to="/profibus/troubleshoot" className={profibusLinkClass} title="Profibus Diagnostics">
                    <Stethoscope size={16} />
                  </NavLink>
                  <NavLink to="/profibus/topology" className={profibusLinkClass} title="Topology Checker">
                    <Network size={16} />
                  </NavLink>
                  <NavLink to="/profibus/calculator" className={profibusLinkClass} title="Cable Calculator">
                    <Cable size={16} />
                  </NavLink>
                  <NavLink to="/profibus/gsd" className={profibusLinkClass} title="GSD Analyzer">
                    <FileCode size={16} />
                  </NavLink>
                  <NavLink to="/profibus/io-mapper" className={profibusLinkClass} title="I/O Mapper">
                    <Map size={16} />
                  </NavLink>
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-800"></div>

            {/* RZA (Relay) Group */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  <NavLink to="/rza/hub" className={rzaLinkClass} title="РЗА Hub">
                    <ShieldAlert size={16} />
                  </NavLink>
                  <NavLink to="/rza/calculator" className={rzaLinkClass} title="Калькулятор Уставок">
                    <ZapOff size={16} />
                  </NavLink>
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-800"></div>

            {/* GOOSE Group */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  <NavLink to="/goose/analyzer" className={gooseLinkClass} title="PCAP Analyzer">
                    <Search size={16} />
                  </NavLink>
                  <NavLink to="/goose/builder" className={gooseLinkClass} title="Config Generator">
                    <FileJson size={16} />
                  </NavLink>
                  <NavLink to="/goose/troubleshoot" className={gooseLinkClass} title="Troubleshooter">
                    <Stethoscope size={16} />
                  </NavLink>
            </div>

            <div className="hidden md:block w-px h-6 bg-gray-800"></div>

            {/* Utilities Group (Report & DWG) */}
             <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  <NavLink to="/report" className={({ isActive }) => 
                      `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-400'
                      }`
                  } title="Генератор Отчетов">
                    <FileText size={16} />
                  </NavLink>
                  <NavLink to="/dwg" className={({ isActive }) => 
                      `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-400'
                      }`
                  } title="CAD Viewer">
                    <PenTool size={16} />
                  </NavLink>
             </div>
          </div>
        )}

        {/* User Auth Section - Right Aligned */}
        <div className="hidden md:flex items-center justify-end min-w-[150px]">
            {user ? (
                <div className="relative">
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 hover:bg-gray-800 py-1 px-2 rounded-lg transition-colors border border-transparent hover:border-gray-700"
                    >
                        <div className="text-right hidden lg:block">
                            <div className="text-sm font-bold text-white leading-none">{user.username}</div>
                            <div className="text-[10px] text-gray-500 font-mono leading-none mt-1">{user.role}</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-[1px]">
                            <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white">
                                        <User size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                                <div className="p-3 border-b border-gray-800">
                                    <p className="text-sm text-white font-bold truncate">{user.username}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <div className="p-1">
                                    <button 
                                        onClick={() => {
                                            navigate('/profile');
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                                    >
                                        <Settings size={16} /> Настройки профиля
                                    </button>
                                    <button 
                                        onClick={() => {
                                            logout();
                                            setIsProfileOpen(false);
                                            navigate('/');
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors mt-1"
                                    >
                                        <LogOut size={16} /> Выйти
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <NavLink to="/login" className="text-sm font-bold text-gray-300 hover:text-white px-3 py-2 transition-colors">
                        Войти
                    </NavLink>
                    <NavLink to="/register" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg shadow-emerald-600/20 transition-all">
                        <User size={16} />
                        <span className="hidden lg:inline">Регистрация</span>
                    </NavLink>
                </div>
            )}
        </div>
      </div>
    </nav>
  );
};