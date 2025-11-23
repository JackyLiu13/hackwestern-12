'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { repairService } from '@/lib/api/repairService';
import type { ApiError, RepairResponse } from '@/lib/api/types';
import { HammerBackground } from '@/components/3d/HammerBackground';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  Upload,
  Scan,
  Home,
  Camera
} from 'lucide-react';

/**
 * REPAIRLENS - HYBRID IMPLEMENTATION
 * * Visual Style & Upload Logic: Adapted from your 'Explode Anything' tool (page.tsx).
 * * Core Logic: RepairLens Workflow (Upload -> Diagnosis -> Analysis -> Guide).
 */

// --- SUB-COMPONENTS ---

// 1. Upload View - Implementation adapted from your page.tsx
interface UploadViewProps {
  onImageSelect: (imageData: string, file: File) => void;
}

const UploadView = ({ onImageSelect }: UploadViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          onImageSelect(e.target.result, file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)] animate-in fade-in duration-500">
      {/* 3D Hammer Background */}
      <HammerBackground />
      
      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-chrome">
            RepairLens
          </h1>
        </div>
        <p className="text-md text-chrome">
          Upload a photo of what's broken. We'll tell you how to fix it.
        </p>
      </header>

      {/* Main Content - Spacer */}
      <div className="flex-1 relative z-10"></div>

      {/* Bottom Button */}
      <div className="relative z-10 pb-12 flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button 
          onClick={handleUploadClick}
          className="px-20 py-4 text-[var(--color-text-primary)] rounded-4xl text-lg transition-all cursor-pointer border-2 border-dashed border-[var(--color-border-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-tertiary)]/30 flex items-center gap-3"
        >
          <Camera size={24} />
          Fix my thing
        </button>
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
  onReplaceImage: () => void;
  onHome: () => void;
}

const DiagnosisView = ({ image, description, onDescriptionChange, onStartAnalysis, onReplaceImage, onHome }: DiagnosisViewProps) => (
  <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)] animate-in slide-in-from-right duration-500">
    {/* Header with Home button */}
    <header className="relative z-10 px-8 py-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Diagnosis</h2>
      <button 
        onClick={onHome} 
        className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-light)] transition-colors"
        title="Start new repair"
      >
        <Home size={20} />
      </button>
    </header>

    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">
      
      {/* Image Preview Card */}
      <div className="relative w-full aspect-video bg-[var(--color-bg-tertiary)] rounded-2xl overflow-hidden border border-[var(--color-border-secondary)] shadow-2xl group">
        {image && <img src={image} alt="Broken Item" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 text-[var(--color-success-light)] mb-1">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Image Captured</span>
          </div>
        </div>
        <button 
          onClick={onReplaceImage} 
          className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 text-[var(--color-text-primary)] transition-colors"
          title="Replace image"
        >
          <Upload size={16} />
        </button>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">What seems to be the problem?</h2>
          <p className="text-[var(--color-text-tertiary)] text-sm">Describe the issue to help Gemini diagnose the mechanics.</p>
        </div>

        <textarea 
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. The steam wand is loose and leaking..."
          autoFocus
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-primary)] rounded-xl p-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent focus:outline-none resize-none h-32 transition-all"
        />

        <button 
          onClick={onStartAnalysis}
          disabled={!description.trim()}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
            ${description.trim()
              ? 'bg-[var(--color-primary-dark)] hover:bg-[var(--color-primary)] text-[var(--color-text-primary)] shadow-lg shadow-[var(--shadow-primary)]' 
              : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-disabled)] cursor-not-allowed'}
          `}
        >
          <Scan size={20} />
          Analyze & Fix
        </button>
      </div>
      </div>
    </div>
  </div>
);

// 3. Analyzing View - Matches the style of your Exploded View loading state
interface AnalyzingViewProps {
  logs: string[];
  onHome: () => void;
}

const AnalyzingView = ({ logs, onHome }: AnalyzingViewProps) => (
  <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)]">
    {/* Header with Home button */}
    <header className="relative z-10 px-8 py-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Analyzing</h2>
      <button 
        onClick={onHome} 
        className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-light)] transition-colors"
        title="Start new repair"
      >
        <Home size={20} />
      </button>
    </header>

    <div className="flex-1 flex items-center justify-center">
      <div className="w-80 space-y-8 text-center">
        <div className="relative w-32 h-32 mx-auto">
           <div className="absolute inset-0 border-4 border-[var(--color-primary)]/20 rounded-full animate-[spin_3s_linear_infinite]" />
           <div className="absolute inset-0 border-t-4 border-[var(--color-primary)] rounded-full animate-[spin_1s_linear_infinite]" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-[var(--color-primary-light)] animate-pulse" />
           </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Generating Repair Guide</h3>
          
          {/* Log Stream */}
          <div className="h-32 overflow-hidden relative mask-linear-fade">
             <div className="space-y-3 flex flex-col items-center">
               {[...logs].reverse().map((log, i) => (
                 <div key={i} className="flex items-center gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in duration-300">
                   <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[var(--color-primary-light)] animate-pulse' : 'bg-[var(--color-border-primary)]'}`} />
                   <span className={i === 0 ? 'text-[var(--color-primary-pale)] font-medium' : 'text-[var(--color-text-muted)]'}>{log}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 4. Guide View - The interactive AR steps
interface GuideViewProps {
  repairData: RepairResponse;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onShowTools: () => void;
  onReset: () => void;
}

const GuideView = ({ repairData, currentStepIndex, onNext, onPrev, onShowTools, onReset }: GuideViewProps) => {
  const step = repairData.steps[currentStepIndex];
  const totalSteps = repairData.steps.length;

  if (!step) {
    return <div>No step data available</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-secondary)] animate-in fade-in duration-500">
      {/* Header */}
      <header className="h-14 border-b border-[var(--color-border-secondary)] flex items-center justify-between px-4 bg-[var(--color-bg-tertiary)] z-20">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{repairData.device}</h1>
            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
              <span className={`px-1.5 py-0.5 rounded border ${
                repairData.source === 'iFixit' 
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]'
                  : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
              }`}>
                "{repairData.source}"
              </span>
              <span>• {totalSteps} Steps</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">        
          <button 
            onClick={onReset} 
            className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-light)] transition-colors"
            title="Start new repair"
          >
            <Home size={20} />
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 relative overflow-hidden bg-black group">
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)]">
            {/* 2D Placeholder View */}
            <div className="text-center space-y-4">
          <div className="relative w-64 h-80 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border-primary)] shadow-2xl transform transition-all duration-700 ease-out">
             {/* Generic Machine Shapes */}
             <div className="absolute bottom-0 w-full h-24 bg-[var(--color-border-primary)] rounded-b-lg" /> 
             <div className="absolute top-0 w-full h-12 bg-[var(--color-bg-tertiary)] rounded-t-lg flex justify-center pt-2">
                <div className="w-32 h-2 bg-[var(--color-text-disabled)] rounded-full" />
             </div>
             <div className="absolute top-12 left-4 w-12 h-32 bg-[var(--color-bg-tertiary)] rounded" />
             <div className="absolute top-20 right-8 w-16 h-16 rounded-full border-4 border-[var(--color-bg-tertiary)]" />
              </div>
              <p className="text-[var(--color-text-tertiary)] text-sm">Placeholder for future 3D view</p>
          </div>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border-secondary)] p-6 pb-8 space-y-6 rounded-t-3xl -mt-6 relative z-10">
         <div className="w-12 h-1 bg-[var(--color-border-primary)] rounded-full mx-auto mb-2" />
         
         <div className="space-y-4">
           <div className="flex items-start justify-between">
             <div>
               <span className="text-[var(--color-primary)] text-xs font-bold tracking-wider uppercase mb-1 block">
                 Step {step.step}
               </span>
               <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                 {step.instruction}
               </h2>
             </div>
           </div>

           {step.warning && (
             <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] p-3 rounded-lg flex gap-3 items-start">
               <AlertTriangle className="text-[var(--color-warning)] shrink-0 mt-0.5" size={16} />
               <p className="text-[var(--color-warning-pale)] text-sm">{step.warning}</p>
             </div>
           )}

           {/* Safety warnings - show on first step */}
           {currentStepIndex === 0 && repairData.safety.length > 0 && (
             <div className="bg-[var(--color-error-bg)] border border-[var(--color-error-border)] p-3 rounded-lg">
               <h3 className="text-[var(--color-error-light)] font-bold text-sm mb-2">Safety Precautions:</h3>
               <ul className="text-[var(--color-error-pale)] text-sm space-y-1">
                 {repairData.safety.map((warning, i) => (
                   <li key={i}>• {warning}</li>
                 ))}
               </ul>
             </div>
           )}
         </div>

         {/* Navigation */}
         <div className="flex items-center justify-between pt-2">
           <button 
             onClick={onPrev}
             disabled={currentStepIndex === 0}
             className="p-4 rounded-full bg-[var(--color-bg-elevated)] disabled:opacity-[var(--opacity-disabled)] text-[var(--color-text-primary)] hover:bg-[var(--color-border-primary)] transition-colors"
           >
             <ChevronLeft size={24} />
           </button>
           
           <div className="flex gap-1.5">
             {repairData.steps.map((_, i) => (
               <div 
                 key={i} 
                 className={`w-2 h-2 rounded-full transition-colors ${
                   i === currentStepIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-primary)]'
                 }`} 
               />
             ))}
           </div>

           {currentStepIndex === totalSteps - 1 ? (
             <button 
               onClick={onReset}
               className="px-6 py-4 rounded-full bg-[var(--color-success)] hover:bg-[var(--color-success-light)] text-[var(--color-text-primary)] font-bold transition-colors shadow-lg flex items-center gap-2"
             >
               <CheckCircle2 size={20} />
               I fixed it!
             </button>
           ) : (
             <button 
               onClick={onNext}
               className="p-4 rounded-full bg-[var(--color-primary-dark)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] transition-colors shadow-lg shadow-[var(--shadow-primary)]"
             >
               <ChevronRight size={24} />
             </button>
           )}
         </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [showTools, setShowTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lightPos, setLightPos] = useState({ x: 0, y: 0 });
  const targetPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPosRef.current = { x: e.clientX, y: e.clientY };
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const animateLight = () => {
      setLightPos((prev) => {
        const dx = targetPosRef.current.x - prev.x;
        const dy = targetPosRef.current.y - prev.y;
        
        // Smooth easing with lag
        return {
          x: prev.x + dx * 0.1,
          y: prev.y + dy * 0.1,
        };
      });

      animationFrameId = requestAnimationFrame(animateLight);
    };

    animationFrameId = requestAnimationFrame(animateLight);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Use Zustand store
  const {
    currentView,
    uploadedImage,
    uploadedFile,
    userDescription,
    repairData,
    analysisLogs,
    currentStepIndex,
    setCurrentView,
    setUploadedImage,
    setUserDescription,
    setRepairData,
    addAnalysisLog,
    clearAnalysisLogs,
    setIsAnalyzing,
    setError,
    setCurrentStepIndex,
  } = useAppStore();

  const handleImageSelect = (imgData: string, file: File) => {
    setUploadedImage(imgData, file);
    setCurrentView('diagnosis');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          handleImageSelect(e.target.result, file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const startAnalysis = async () => {
    if (!uploadedFile || !userDescription.trim()) {
      setError('Please provide an image and description');
      return;
    }

    setCurrentView('analyzing');
    setIsAnalyzing(true);
    clearAnalysisLogs();
    setError(null);

    try {
      // Use streaming API for real-time log updates
      const response = await repairService.analyzeStreaming(
        {
          file: uploadedFile,
          user_prompt: userDescription,
        },
        (logMessage: string) => {
          // This callback fires for each log in real-time
          addAnalysisLog(logMessage);
        }
      );

      // Save result
      setRepairData(response);

      // Transition to guide view after a brief moment
      setTimeout(() => {
        setIsAnalyzing(false);
        setCurrentView('guide');
      }, 1000);

    } catch (err: any) {
      const error = err as ApiError;
      setError(error.detail || 'Failed to analyze image. Please try again.');
      setIsAnalyzing(false);
      setCurrentView('diagnosis');
      console.error('Analysis error:', error);
    }
  };

  return (
    <div className="bg-[var(--color-bg-primary)] min-h-screen text-[var(--color-text-primary)] font-[var(--font-family-sans)] relative">
      {/* Cursor Light Effect - Only on landing page */}
      {currentView === 'upload' && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] mix-blend-screen"
          style={{
            background: `radial-gradient(400px circle at ${lightPos.x}px ${lightPos.y}px, rgba(100, 150, 255, 0.3), transparent 60%)`,
          }}
        />
      )}
      
      {/* Hidden file input shared across views */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentView === 'upload' && (
        <UploadView onImageSelect={handleImageSelect} />
      )}

      {currentView === 'diagnosis' && (
        <DiagnosisView 
          image={uploadedImage}
          description={userDescription}
          onDescriptionChange={setUserDescription}
          onStartAnalysis={startAnalysis}
          onReplaceImage={openFileDialog}
          onHome={() => setCurrentView('upload')}
        />
      )}
      
      {currentView === 'analyzing' && (
        <AnalyzingView 
          logs={analysisLogs}
          onHome={() => {
            setCurrentView('upload');
            setUploadedImage(null, null);
            setUserDescription('');
            clearAnalysisLogs();
            setError(null);
          }}
        />
      )}
      
      {currentView === 'guide' && repairData && (
        <GuideView 
          repairData={repairData}
          currentStepIndex={currentStepIndex}
          onNext={() => 
            setCurrentStepIndex(
              Math.min(repairData.steps.length - 1, currentStepIndex + 1)
            )
          }
          onPrev={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
          onShowTools={() => setShowTools(true)}
          onReset={() => {
            // Reset all state and go back to upload
            setCurrentView('upload');
            setUploadedImage(null, null);
            setUserDescription('');
            setRepairData(null);
            clearAnalysisLogs();
            setCurrentStepIndex(0);
            setError(null);
          }}
        />
      )}
    </div>
  );
}