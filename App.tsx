import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Welcome } from './pages/Welcome';
import { Converter } from './pages/Converter';
import { ModbusInfo } from './pages/ModbusInfo';
import { ModbusBuilder } from './pages/ModbusBuilder';
import { ModbusMap } from './pages/ModbusMap';
import { ModbusMonitor } from './pages/ModbusMonitor';
// GOOSE Pages
import { GooseWiki } from './pages/GooseWiki';
import { GooseAnalyzer } from './pages/GooseAnalyzer';
import { GooseBuilder } from './pages/GooseBuilder';
import { GooseTroubleshoot } from './pages/GooseTroubleshoot';
// Report Page
import { ReportGenerator } from './pages/ReportGenerator';
// PROFIBUS Pages
import { ProfibusTroubleshoot } from './pages/ProfibusTroubleshoot';
import { ProfibusTopology } from './pages/ProfibusTopology';
import { ProfibusCalculator } from './pages/ProfibusCalculator';
import { GSDAnalyzer } from './pages/GSDAnalyzer';
import { ProfibusWiki } from './pages/ProfibusWiki';
import { ProfibusIOMapper } from './pages/ProfibusIOMapper';
// RZA Pages
import { RzaHub } from './pages/RzaHub';
import { RzaCalculator } from './pages/RzaCalculator';
import { ComtradeAnalyzer } from './pages/ComtradeAnalyzer';
import { RelayDatabase } from './pages/RelayDatabase';
import { RzaNavigator } from './pages/RzaNavigator';
import { RzaAiAssistant } from './pages/RzaAiAssistant';
import { RzaGooseTiming } from './pages/RzaGooseTiming';
import { RzaVirtualRelay } from './pages/RzaVirtualRelay'; // Imported
// Utils
import { DwgViewer } from './pages/DwgViewer';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
// AI Chat
import { AIChat } from './components/AIChat';

import { Info } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Check if we are on wide pages
  const isWidePage = [
    '/map', '/monitor', '/goose/analyzer', '/report', 
    '/profibus/topology', '/profibus/gsd', '/profibus/io-mapper', 
    '/rza/hub', '/rza/calculator', '/rza/comtrade', '/rza/database', '/rza/navigator', '/rza/ai-assistant', '/rza/goose-timing', '/rza/virtual-relay',
    '/dwg', '/'
  ].includes(location.pathname);

  // Hide footer on login/register pages for cleaner look
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      
      {/* --- CINEMATIC BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base Dark Gradient */}
        <div className="absolute inset-0 bg-gray-950"></div>
        
        {/* Engineering Grid Pattern - Subtle & Technical */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Ambient Top Glow (Indigo/Purple hint) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full opacity-50 mix-blend-screen"></div>
        
        {/* Ambient Bottom Glow (Emerald/Teal hint) */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full opacity-40 mix-blend-screen"></div>
        
        {/* Noise Texture for material feel */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
      </div>

      {/* --- CONTENT LAYER (z-10 to stay above background) --- */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className={`flex-grow container mx-auto px-4 py-8 transition-all duration-300 ${
          isWidePage ? 'max-w-[95%] xl:max-w-[1600px]' : 'max-w-6xl'
        }`}>
          {children}
        </main>
        
        {!isAuthPage && (
            <footer className="border-t border-gray-800 py-6 mt-12 bg-gray-900/50 backdrop-blur-sm no-print">
              <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                <p>© {new Date().getFullYear()} EngiTools Utils. Created for engineers.</p>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <span className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer">
                    <Info size={16} /> v3.6.0 (CAD Update)
                  </span>
                </div>
              </div>
            </footer>
        )}
      </div>

      {/* Global AI Chatbot (z-50 handles itself) */}
      {!isAuthPage && <AIChat />}
    </div>
  );
};

// Component to handle the root path conditional logic
const RootRedirect: React.FC = () => {
    const { user } = useAuth();
    return user ? <LandingPage /> : <Welcome />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
          <Layout>
            <Routes>
              {/* Public Root logic */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Modbus Routes */}
              <Route path="/modbus/converter" element={<ProtectedRoute><Converter /></ProtectedRoute>} />
              <Route path="/builder" element={<ProtectedRoute><ModbusBuilder /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><ModbusMap /></ProtectedRoute>} />
              <Route path="/monitor" element={<ProtectedRoute><ModbusMonitor /></ProtectedRoute>} />
              <Route path="/modbus" element={<ProtectedRoute><ModbusInfo /></ProtectedRoute>} />
              
              {/* GOOSE Routes */}
              <Route path="/goose/wiki" element={<ProtectedRoute><GooseWiki /></ProtectedRoute>} />
              <Route path="/goose/analyzer" element={<ProtectedRoute><GooseAnalyzer /></ProtectedRoute>} />
              <Route path="/goose/builder" element={<ProtectedRoute><GooseBuilder /></ProtectedRoute>} />
              <Route path="/goose/troubleshoot" element={<ProtectedRoute><GooseTroubleshoot /></ProtectedRoute>} />

              {/* PROFIBUS Routes */}
              <Route path="/profibus/troubleshoot" element={<ProtectedRoute><ProfibusTroubleshoot /></ProtectedRoute>} />
              <Route path="/profibus/topology" element={<ProtectedRoute><ProfibusTopology /></ProtectedRoute>} />
              <Route path="/profibus/calculator" element={<ProtectedRoute><ProfibusCalculator /></ProtectedRoute>} />
              <Route path="/profibus/gsd" element={<ProtectedRoute><GSDAnalyzer /></ProtectedRoute>} />
              <Route path="/profibus/io-mapper" element={<ProtectedRoute><ProfibusIOMapper /></ProtectedRoute>} />
              <Route path="/profibus/wiki" element={<ProtectedRoute><ProfibusWiki /></ProtectedRoute>} />

              {/* RZA Routes */}
              <Route path="/rza/hub" element={<ProtectedRoute><RzaHub /></ProtectedRoute>} />
              <Route path="/rza/calculator" element={<ProtectedRoute><RzaCalculator /></ProtectedRoute>} />
              <Route path="/rza/comtrade" element={<ProtectedRoute><ComtradeAnalyzer /></ProtectedRoute>} />
              <Route path="/rza/database" element={<ProtectedRoute><RelayDatabase /></ProtectedRoute>} />
              <Route path="/rza/navigator" element={<ProtectedRoute><RzaNavigator /></ProtectedRoute>} />
              <Route path="/rza/ai-assistant" element={<ProtectedRoute><RzaAiAssistant /></ProtectedRoute>} />
              <Route path="/rza/goose-timing" element={<ProtectedRoute><RzaGooseTiming /></ProtectedRoute>} />
              <Route path="/rza/virtual-relay" element={<ProtectedRoute><RzaVirtualRelay /></ProtectedRoute>} />

              {/* Tools Route */}
              <Route path="/dwg" element={<ProtectedRoute><DwgViewer /></ProtectedRoute>} />
              <Route path="/report" element={<ProtectedRoute><ReportGenerator /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;