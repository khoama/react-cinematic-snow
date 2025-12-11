import React, { useState } from 'react';
import Snowfall from './components/Snowfall';
import Controls from './components/Controls';
import { SnowfallProps } from './types';
import { Menu, X, Github } from 'lucide-react';

const App: React.FC = () => {
  const [settings, setSettings] = useState<SnowfallProps>({
    density: 1200,
    speed: 1.2,
    wind: 0.2,
    color: '#ffffff',
    minRadius: 0.2,
    maxRadius: 2.3,
    roughness: 0.9,
    opacity: 1.0,
    renderer: 'auto',
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSettingChange = (key: keyof SnowfallProps, value: number | string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-900">
      {/* Background Image / Gradient - covers entire viewport */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1610011722905-a2d4b5fca8c0?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

      {/* Snowfall Component - covers entire viewport */}
      <Snowfall {...settings} className="z-10" />

      {/* Sidebar Toggle Button (Mobile) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20 md:hidden"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Controls Sidebar */}
      <aside
        className={`relative z-40 h-full w-80 flex-shrink-0 transform bg-slate-900/80 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        } border-r border-white/10 shadow-2xl`}
      >
        <Controls settings={settings} onChange={handleSettingChange} />
        
        {/* Footer in Sidebar */}
        <div className="absolute bottom-0 w-full border-t border-white/10 p-4 space-y-2">
          <a href="#" className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white">
            <Github size={14} />
            <span>View Source on GitHub</span>
          </a>
          <div className="text-center">
            <a 
              href="https://unsplash.com/photos/a2d4b5fca8c0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              Background by Unsplash
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area - takes remaining space */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center p-4 text-center">
        <h1 className="pointer-events-none mb-2 text-5xl font-black tracking-tight text-white drop-shadow-lg md:text-7xl">
          React<span className="text-blue-400">Cinematic</span>Snow
        </h1>
        <p className="pointer-events-none max-w-lg text-lg font-light text-blue-100 drop-shadow-md">
          A high-performance TypeScript React component for cinematic snow effects.
        </p>
      </main>
    </div>
  );
};

export default App;