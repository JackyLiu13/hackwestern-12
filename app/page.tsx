'use client';
import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Maximize, 
  Box, 
  Scan, 
  Upload, 
  Cpu, 
  Battery, 
  Aperture, 
  Smartphone,
  Info,
  CheckCircle2,
  Loader2
} from 'lucide-react';

/**
 * SAM 3 EXPLODED VIEW TOOL (CSS 3D Engine)
 * * A stable, high-performance implementation of the exploded view concept.
 * Uses CSS3 transform-style: preserve-3d to avoid WebGL context crashes
 * while maintaining smooth 60fps interactivity.
 */

export default function App() {
  const [appState, setAppState] = useState('upload'); // upload, scanning, interactive
  const [scanProgress, setScanProgress] = useState(0);
  
  // 3D State
  const [explode, setExplode] = useState(0); // 0 to 1
  const [rotation, setRotation] = useState({ x: 60, y: 0, z: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [activePart, setActivePart] = useState<string | null>(null);

  // --- SIMULATED WORKFLOW ---

  const startScan = () => {
    setAppState('scanning');
    setScanProgress(0);
    
    // Simulate SAM 3 analysis phases
    const phases = [10, 30, 60, 80, 100];
    phases.forEach((p, i) => {
      setTimeout(() => {
        setScanProgress(p);
        if (p === 100) setTimeout(() => setAppState('interactive'), 500);
      }, (i + 1) * 800);
    });
  };

  // --- 3D INTERACTION HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (appState !== 'interactive') return;
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;
    
    setRotation(prev => ({
      x: Math.max(0, Math.min(90, prev.x - deltaY * 0.5)), // Limit tilt (0 to 90 deg)
      y: prev.y,
      z: prev.z - deltaX * 0.5 // Infinite rotation on Z axis
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- COMPONENTS ---

  interface LayerProps {
    zOffset: number;
    color: string;
    label: string;
    icon?: React.ComponentType<{ className?: string; size?: number }>;
    content: React.ReactNode;
    opacity?: number;
  }

  const Layer = ({ zOffset, color, label, icon: Icon, content, opacity = 0.95 }: LayerProps) => {
    // Calculate real Z position based on explode factor
    const currentZ = zOffset * explode * 250; 
    const isHovered = activePart === label;

    return (
      <div 
        className="absolute top-1/2 left-1/2 w-56 h-96 transition-all duration-500 ease-out"
        style={{
          transform: `translate(-50%, -50%) translateZ(${currentZ}px)`,
          transformStyle: 'preserve-3d',
        }}
        onMouseEnter={() => setActivePart(label)}
        onMouseLeave={() => setActivePart(null)}
      >
        {/* Physical Plate */}
        <div 
          className={`
            absolute inset-0 rounded-3xl border transition-all duration-300 backdrop-blur-md
            ${isHovered ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'border-white/10 shadow-2xl'}
          `}
          style={{
            backgroundColor: color,
            opacity: opacity,
            boxShadow: isHovered ? '' : '0 0 15px rgba(0,0,0,0.5)',
          }}
        >
          {/* Side Thickness (Pseudo-3D) */}
          <div className="absolute inset-0 rounded-3xl bg-black/20 transform translate-z-[-4px]" />
          
          {/* Layer Content */}
          <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {content}
            {/* Tech Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          </div>
        </div>

        {/* Floating Label (Only visible when exploded) */}
        <div 
          className={`
            absolute top-8 right-0 h-px bg-blue-500 origin-left transition-all duration-300
            ${(isHovered || explode > 0.1) ? 'w-40 opacity-100' : 'w-0 opacity-0'}
          `}
          style={{ transform: 'translateX(100%)' }}
        >
          {/* Label Text Tag */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-4">
            <div className={`
              bg-slate-900/90 border border-blue-500/30 text-blue-100 px-4 py-2 rounded-lg 
              text-xs font-bold tracking-wide shadow-xl flex items-center gap-3 whitespace-nowrap
              backdrop-blur-xl
            `}>
              {Icon && <Icon size={14} className="text-blue-400" />}
              {label}
            </div>
          </div>
          {/* Connector Dot */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]" />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-screen bg-[#09090b] text-white font-sans overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      
      {/* --- 1. UPLOAD SCREEN --- */}
      {appState === 'upload' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b] p-6">
          <div className="max-w-2xl w-full text-center space-y-10">
            <div className="space-y-4">
               <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-2xl mb-4">
                  <Layers className="w-12 h-12 text-blue-500" />
               </div>
               <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                 Explode Anything
               </h1>
               <p className="text-xl text-slate-400 max-w-lg mx-auto">
                 Upload a photo. SAM 3 will identify the parts. SAM 3D will build the geometry.
               </p>
            </div>

            <button 
              onClick={startScan}
              className="group relative inline-flex flex-col items-center gap-4 px-16 py-12 rounded-3xl border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-900/50 transition-all cursor-pointer"
            >
               <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
               <span className="text-slate-300 font-medium">Click to upload image</span>
            </button>
          </div>
        </div>
      )}

      {/* --- 2. SCANNING SCREEN --- */}
      {appState === 'scanning' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]">
           <div className="w-80 space-y-8 text-center">
              <div className="relative w-32 h-32 mx-auto">
                 <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-[spin_3s_linear_infinite]" />
                 <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-[spin_1s_linear_infinite]" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Scan className="w-10 h-10 text-blue-400 animate-pulse" />
                 </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Analyzing Geometry</h3>
                <div className="flex justify-between text-xs text-slate-400 font-mono uppercase tracking-widest">
                   <span>SAM 3 Processing</span>
                   <span>{scanProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-blue-500 transition-all duration-300 ease-out"
                     style={{ width: `${scanProgress}%` }}
                   />
                </div>
                <p className="text-xs text-slate-500 pt-2">
                  {scanProgress < 30 ? "Segmenting components..." : 
                   scanProgress < 60 ? "Generating 3D mesh..." : 
                   "Texturing hidden surfaces..."}
                </p>
              </div>
           </div>
        </div>
      )}

      {/* --- 3. INTERACTIVE WORKSPACE --- */}
      
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-40 px-6 py-4 flex justify-between items-center pointer-events-none transition-opacity duration-500 ${appState === 'interactive' ? 'opacity-100' : 'opacity-0'}`}>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-wide">Explode<span className="text-blue-500">AI</span></h1>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-3">
          <button 
             onClick={() => setAppState('upload')}
             className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-2 border border-white/5"
          >
            <Scan size={14} />
            New Scan
          </button>
        </div>
      </header>

      {/* 3D VIEWPORT */}
      <div className={`flex-1 relative flex items-center justify-center perspective-1000 transition-opacity duration-1000 ${appState === 'interactive' ? 'opacity-100' : 'opacity-0'}`}>
        <div 
          className="relative w-0 h-0 transition-transform duration-75 ease-linear"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(0deg) rotateZ(${rotation.z}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Floor Shadow */}
          <div 
            className="absolute top-1/2 left-1/2 w-80 h-[30rem] bg-blue-500/20 blur-[100px] transition-all duration-500 rounded-full"
            style={{
              transform: `translate(-50%, -50%) translateZ(${-200 - (explode * 150)}px)`,
              opacity: 0.3 + (explode * 0.3)
            }}
          />

          {/* --- COMPONENT LAYERS --- */}

          {/* 1. Back Glass */}
          <Layer 
            zOffset={-1.2} 
            label="Rear Glass Panel" 
            color="#0f172a"
            icon={Smartphone}
            content={<div className="w-full h-full bg-slate-900 rounded-2xl border border-white/5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 to-slate-950" />}
          />

          {/* 2. Wireless Coil */}
          <Layer 
            zOffset={-0.6} 
            label="Wireless Charging Coil" 
            color="#1e293b" 
            icon={Zap}
            opacity={0.8}
            content={
              <div className="w-32 h-32 rounded-full border-8 border-orange-500/20 flex items-center justify-center">
                 <div className="w-24 h-24 rounded-full border-8 border-orange-500/30" />
              </div>
            }
          />

          {/* 3. Battery & Chassis */}
          <Layer 
            zOffset={0} 
            label="Li-Ion Battery (4500mAh)" 
            color="#020617" 
            icon={Battery}
            opacity={1}
            content={
              <div className="w-full h-full flex flex-col items-center py-12 gap-6">
                <div className="w-36 h-52 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                  <Battery className="text-slate-500 mb-2" size={40} />
                  <span className="text-[10px] text-slate-500 font-mono">LITHIUM ION</span>
                </div>
              </div>
            }
          />

          {/* 4. Main Logic Board */}
          <Layer 
            zOffset={0.8} 
            label="A16 Bionic Logic Board" 
            color="rgba(6, 78, 59, 0.85)"
            icon={Cpu}
            content={
              <div className="w-full h-full relative">
                {/* CPU */}
                <div className="absolute top-12 right-6 w-16 h-16 bg-amber-500/10 border border-amber-500/40 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <div className="w-8 h-8 bg-amber-500/80 rounded opacity-50" />
                </div>
                {/* RAM Modules */}
                <div className="absolute top-36 left-6 w-10 h-28 bg-emerald-900/50 border border-emerald-500/30 rounded flex flex-col gap-1 p-1">
                   {[1,2,3,4].map(i => <div key={i} className="flex-1 bg-emerald-500/20 rounded-sm" />)}
                </div>
                {/* Traces */}
                <svg className="absolute inset-0 w-full h-full stroke-emerald-400/30" style={{strokeWidth: 1.5}}>
                    <path d="M30,30 L80,30 L80,80 M150,150 L180,150 L180,250" fill="none" strokeDasharray="4 4" />
                </svg>
              </div>
            }
          />

          {/* 5. Camera Module */}
          <Layer 
            zOffset={1.5} 
            label="Triple Lens Array" 
            color="#0f172a" 
            icon={Aperture}
            content={
               <div className="absolute top-6 left-6 w-full">
                 <div className="flex flex-wrap gap-3 w-32">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-12 h-12 rounded-full bg-black border-4 border-slate-700 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="w-4 h-4 rounded-full bg-indigo-900 shadow-inner" />
                     </div>
                   ))}
                 </div>
               </div>
            }
          />

          {/* 6. Screen */}
          <Layer 
            zOffset={2.5} 
            label="Super Retina XDR Display" 
            color="rgba(23, 37, 84, 0.3)" 
            icon={Maximize}
            content={
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500/5 to-transparent relative overflow-hidden">
                 {/* Screen Glare */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                 <div className="text-center space-y-1">
                   <div className="text-6xl font-thin text-white/90 tracking-tighter">12:45</div>
                   <div className="text-xs text-blue-200/60 font-medium uppercase tracking-widest">Wednesday, Nov 21</div>
                 </div>
              </div>
            }
          />
        </div>
      </div>

      {/* --- CONTROLS FOOTER --- */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50 transition-all duration-700 ${appState === 'interactive' ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl ring-1 ring-black/50">
          <div className="flex items-center gap-5 px-6 py-4">
            
            {/* Label Left */}
            <div className="flex flex-col items-center gap-1.5 w-14">
              <Box size={20} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Solid</span>
            </div>
            
            {/* MAIN SLIDER */}
            <div className="flex-1 relative h-12 flex items-center group cursor-pointer">
              {/* Track */}
              <div className="absolute inset-x-0 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-100 ease-out" 
                  style={{ width: `${explode * 100}%` }} 
                />
              </div>
              
              {/* Hidden Input */}
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.005" 
                value={explode} 
                onChange={(e) => setExplode(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
              
              {/* Visual Handle */}
              <div 
                className="absolute w-6 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] border-[3px] border-blue-500 pointer-events-none transition-all duration-100 ease-out z-10"
                style={{ left: `calc(${explode * 100}% - 12px)` }} 
              >
                <div className="absolute inset-0 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20 animate-ping" />
              </div>
            </div>

            {/* Label Right */}
            <div className="flex flex-col items-center gap-1.5 w-14">
              <Layers size={20} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Exploded</span>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 flex items-center justify-center gap-2 opacity-60">
           <Info size={14} className="text-blue-400" /> 
           <span className="text-xs text-slate-400 font-medium">Click & Drag to rotate 3D model</span>
        </div>
      </div>

      {/* --- GLOBAL STYLES --- */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        /* Hide scrollbar */
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Helper for icons in JSX
interface ZapProps {
  className?: string;
  size?: number;
}

const Zap = ({ className, size }: ZapProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);