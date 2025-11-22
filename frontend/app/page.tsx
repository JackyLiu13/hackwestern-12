'use client';
import React, { useState, useRef } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  ArrowRight,
  Hammer,
  Upload,
  Scan
} from 'lucide-react';

/**
 * REPAIRLENS - HYBRID IMPLEMENTATION
 * * Visual Style & Upload Logic: Adapted from your 'Explode Anything' tool (page.tsx).
 * * Core Logic: RepairLens Workflow (Upload -> Diagnosis -> Analysis -> Guide).
 */

// --- MOCK DATA ---
const MOCK_API_RESPONSE = {
  device_name: "Breville Barista Express",
  difficulty: "Moderate",
  source: "Gemini-Generative",
  tools_needed: ["Torx T20 Driver", "Spudger", "Phillips #2"],
  steps: [
    {
      step_number: 1,
      title: "Remove Water Reservoir",
      instruction: "Lift the water tank vertically to disengage the bottom valve. Set it aside to prevent spills.",
      warning: "Ensure machine is unplugged.",
      mask_id: "tank",
      overlay: { type: "arrow_up", x: 50, y: 30 }
    },
    {
      step_number: 2,
      title: "Locate Rear Screws",
      instruction: "Identify the two T20 Torx screws hidden beneath the tank rim. These hold the top panel in place.",
      tools_needed: ["Torx T20 Driver"],
      mask_id: "screws",
      overlay: { type: "highlight", x: 50, y: 45 }
    },
    {
      step_number: 3,
      title: "Pry Top Panel",
      instruction: "Insert a spudger into the seam between the top panel and the side chassis. Gently leverage upwards to release the plastic clips.",
      warning: "Plastic clips are fragile.",
      tools_needed: ["Spudger"],
      mask_id: "panel",
      overlay: { type: "motion_pry", x: 60, y: 40 }
    }
  ]
};

const ANALYSIS_TIMELINE = [
  { msg: "Sending image to Vision Engine...", delay: 500 },
  { msg: "Gemini 2.5: Identifying object as 'Espresso Machine'...", delay: 1500 },
  { msg: "LangGraph: Checking iFixit API for guides...", delay: 2500 },
  { msg: "iFixit: No exact match found (404).", delay: 3500 },
  { msg: "LangGraph: Rerouting to Generative Brain...", delay: 4000 },
  { msg: "Gemini: Deducing disassembly steps...", delay: 5500 },
  { msg: "SAM 3: Generating segmentation masks for 3 parts...", delay: 7000 },
  { msg: "Compiling AR Scene Graph...", delay: 8000 },
];

// --- SUB-COMPONENTS ---

// 1. Upload View - Implementation adapted from your page.tsx
interface UploadViewProps {
  onImageSelect: (imageData: string) => void;
}

const UploadView = ({ onImageSelect }: UploadViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          onImageSelect(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b] p-6 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full text-center space-y-10">
        <div className="space-y-4">
           <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 rounded-2xl mb-4">
              <Wrench className="w-12 h-12 text-blue-500" />
           </div>
           <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
             RepairLens
           </h1>
           <p className="text-xl text-slate-400 max-w-lg mx-auto">
             Upload a photo of what's broken. AI will generate an Ikea-style repair guide.
           </p>
        </div>

        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button 
            onClick={handleUploadClick}
            className="group relative inline-flex flex-col items-center gap-4 px-16 py-12 rounded-3xl border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-900/50 transition-all cursor-pointer"
          >
             <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
             <span className="text-slate-300 font-medium">Click to upload image</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Diagnosis View - The new transition screen you requested
interface DiagnosisViewProps {
  image: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  onStartAnalysis: () => void;
  onBack: () => void;
}

const DiagnosisView = ({ image, description, onDescriptionChange, onStartAnalysis, onBack }: DiagnosisViewProps) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b] p-6 animate-in slide-in-from-right duration-500">
    <div className="max-w-md w-full space-y-8">
      
      {/* Image Preview Card */}
      <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
        {image && <img src={image} alt="Broken Item" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Image Captured</span>
          </div>
        </div>
        <button 
          onClick={onBack} 
          className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 text-white transition-colors"
        >
          <Upload size={16} />
        </button>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">What seems to be the problem?</h2>
          <p className="text-slate-400 text-sm">Describe the issue to help Gemini diagnose the mechanics.</p>
        </div>

        <textarea 
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. The steam wand is loose and leaking..."
          autoFocus
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none h-32 transition-all"
        />

        <button 
          onClick={onStartAnalysis}
          disabled={!description.trim()}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
            ${description.trim()
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
          `}
        >
          <Scan size={20} />
          Analyze & Fix
        </button>
      </div>
    </div>
  </div>
);

// 3. Analyzing View - Matches the style of your Exploded View loading state
interface AnalyzingViewProps {
  logs: string[];
}

const AnalyzingView = ({ logs }: AnalyzingViewProps) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]">
     <div className="w-80 space-y-8 text-center">
        <div className="relative w-32 h-32 mx-auto">
           <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-[spin_3s_linear_infinite]" />
           <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-[spin_1s_linear_infinite]" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-blue-400 animate-pulse" />
           </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Generating Repair Guide</h3>
          
          {/* Log Stream */}
          <div className="h-32 overflow-hidden relative mask-linear-fade">
             <div className="space-y-3 flex flex-col items-center">
               {[...logs].reverse().map((log, i) => (
                 <div key={i} className="flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in duration-300">
                   <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`} />
                   <span className={i === 0 ? 'text-blue-200 font-medium' : 'text-slate-500'}>{log}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
     </div>
  </div>
);

// 4. Guide View - The interactive AR steps
interface Step {
  step_number: number;
  title: string;
  instruction: string;
  warning?: string;
  mask_id: string;
  overlay: { type: string; x: number; y: number };
  tools_needed?: string[];
}

interface GuideViewProps {
  step: Step;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onShowTools: () => void;
}

const GuideView = ({ step, currentStepIndex, totalSteps, onNext, onPrev, onShowTools }: GuideViewProps) => {
  return (
    <div className="flex flex-col h-screen bg-slate-950 animate-in fade-in duration-500">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <Wrench size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{MOCK_API_RESPONSE.device_name}</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">{MOCK_API_RESPONSE.difficulty}</span>
              <span>• {totalSteps} Steps</span>
            </div>
          </div>
        </div>
        <button onClick={onShowTools} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
          <Hammer size={20} />
        </button>
      </header>

      {/* AR Workspace */}
      <div className="flex-1 relative overflow-hidden bg-black group">
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          {/* Mocking the Machine Image */}
          <div className="relative w-64 h-80 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl transform transition-all duration-700 ease-out" style={{
            transform: currentStepIndex === 1 ? 'scale(1.1) translateY(10px)' : 'scale(1)'
          }}>
             {/* Generic Machine Shapes */}
             <div className="absolute bottom-0 w-full h-24 bg-slate-700 rounded-b-lg" /> 
             <div className="absolute top-0 w-full h-12 bg-slate-600 rounded-t-lg flex justify-center pt-2">
                <div className="w-32 h-2 bg-slate-500 rounded-full" />
             </div>
             <div className="absolute top-12 left-4 w-12 h-32 bg-slate-600 rounded" />
             <div className="absolute top-20 right-8 w-16 h-16 rounded-full border-4 border-slate-600" />

             {/* SAM 3 MASKS */}
             
             {/* Mask: Tank */}
             <div className={`
               absolute top-12 left-4 w-12 h-32 rounded border-2 border-blue-500 bg-blue-500/20 transition-opacity duration-500
               ${step.mask_id === 'tank' ? 'opacity-100' : 'opacity-0'}
             `}>
               <div className="absolute -right-2 top-1/2 translate-x-full -translate-y-1/2 pl-4">
                 <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap font-bold">
                   Water Tank
                 </div>
                 <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                 <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-4 h-px bg-blue-500" />
               </div>
             </div>

             {/* Mask: Screws */}
             <div className={`absolute top-8 left-0 w-full flex justify-around px-8 transition-opacity duration-500 ${step.mask_id === 'screws' ? 'opacity-100' : 'opacity-0'}`}>
               <div className="w-4 h-4 rounded-full border-2 border-yellow-500 bg-yellow-500/30 animate-ping" />
               <div className="w-4 h-4 rounded-full border-2 border-yellow-500 bg-yellow-500/30 animate-ping" style={{ animationDelay: '0.2s' }} />
             </div>

             {/* Mask: Panel */}
             <div className={`
               absolute top-0 w-full h-12 border-b-2 border-purple-500 bg-purple-500/10 transition-opacity duration-500
               ${step.mask_id === 'panel' ? 'opacity-100' : 'opacity-0'}
             `}/>
          </div>
        </div>

        {step.mask_id === 'tank' && (
           <div className="absolute top-1/2 left-1/2 -translate-x-16 -translate-y-20 flex flex-col items-center animate-bounce">
             <ArrowRight className="-rotate-90 text-white drop-shadow-md" size={32} />
           </div>
        )}
      </div>

      {/* Instructions Panel */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 pb-8 space-y-6 rounded-t-3xl -mt-6 relative z-10">
         <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
         
         <div className="space-y-4">
           <div className="flex items-start justify-between">
             <div>
               <span className="text-blue-500 text-xs font-bold tracking-wider uppercase mb-1 block">Step {step.step_number}</span>
               <h2 className="text-xl font-bold text-white">{step.title}</h2>
             </div>
             {step.tools_needed && (
               <div className="flex gap-1">
                 {step.tools_needed.map((t: string, i: number) => (
                   <div key={i} className="bg-slate-800 p-1.5 rounded border border-slate-700" title={t}>
                     <Wrench size={12} className="text-slate-400" />
                   </div>
                 ))}
               </div>
             )}
           </div>

           <p className="text-slate-300 leading-relaxed">
             {step.instruction}
           </p>

           {step.warning && (
             <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 items-start">
               <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
               <p className="text-yellow-200 text-sm">{step.warning}</p>
             </div>
           )}
         </div>

         {/* Navigation */}
         <div className="flex items-center justify-between pt-2">
           <button 
             onClick={onPrev}
             disabled={currentStepIndex === 0}
             className="p-4 rounded-full bg-slate-800 disabled:opacity-30 text-white hover:bg-slate-700 transition-colors"
           >
             <ChevronLeft size={24} />
           </button>
           
           <div className="flex gap-1.5">
             {MOCK_API_RESPONSE.steps.map((_, i) => (
               <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentStepIndex ? 'bg-blue-500' : 'bg-slate-700'}`} />
             ))}
           </div>

           <button 
             onClick={onNext}
             disabled={currentStepIndex === totalSteps - 1}
             className="p-4 rounded-full bg-blue-600 disabled:opacity-30 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
           >
             <ChevronRight size={24} />
           </button>
         </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [view, setView] = useState<'upload' | 'diagnosis' | 'analyzing' | 'guide'>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTools, setShowTools] = useState(false);

  const handleImageSelect = (imgData: string) => {
    setImage(imgData);
    setView('diagnosis'); // Move to new Diagnosis screen
  };

  const startAnalysis = () => {
    setView('analyzing');
    setAnalysisLog([]); 

    let step = 0;
    const interval = setInterval(() => {
      if (step >= ANALYSIS_TIMELINE.length) {
        clearInterval(interval);
        setTimeout(() => setView('guide'), 1000);
        return;
      }
      
      const logItem = ANALYSIS_TIMELINE[step];
      if (logItem) {
          setAnalysisLog(prev => [...prev, logItem.msg]);
      }
      step++;
    }, 1000);
  };

  return (
    <div className="bg-[#09090b] min-h-screen text-white font-sans selection:bg-blue-500/30">
      {view === 'upload' && (
        <UploadView onImageSelect={handleImageSelect} />
      )}

      {view === 'diagnosis' && (
        <DiagnosisView 
          image={image}
          description={description}
          onDescriptionChange={setDescription}
          onStartAnalysis={startAnalysis}
          onBack={() => setView('upload')}
        />
      )}
      
      {view === 'analyzing' && (
        <AnalyzingView logs={analysisLog} />
      )}
      
      {view === 'guide' && (
        <GuideView 
          step={MOCK_API_RESPONSE.steps[currentStep]}
          currentStepIndex={currentStep}
          totalSteps={MOCK_API_RESPONSE.steps.length}
          onNext={() => setCurrentStep(Math.min(MOCK_API_RESPONSE.steps.length - 1, currentStep + 1))}
          onPrev={() => setCurrentStep(Math.max(0, currentStep - 1))}
          onShowTools={() => setShowTools(true)}
        />
      )}
    </div>
  );
}