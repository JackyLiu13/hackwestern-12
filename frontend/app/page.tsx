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
  Download,
  Home,
  Camera,
  Wrench,
  Hammer,
  ArrowRight
} from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { RepairGuide } from '@/types/repair';

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
  onBack: () => void;
}

const DiagnosisView = ({ image, description, onDescriptionChange, onStartAnalysis, onBack }: DiagnosisViewProps) => (
  <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)] animate-in slide-in-from-right duration-500">
    {/* Header with Home button */}
    <header className="relative z-10 px-8 py-6 flex items-center justify-between">
      <button
        onClick={onBack}
        className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-dark)] transition-colors"
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
            onClick={onBack}
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
            w-full py-4 rounded-4xl text-lg transition-all flex items-center justify-center gap-3
            ${description.trim()
                ? 'border-2 border-dashed border-[var(--color-border-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-tertiary)]/30 text-[var(--color-text-primary)] cursor-pointer'
                : 'border-2 border-dashed border-[var(--color-border-primary)]/50 text-[var(--color-text-disabled)] cursor-not-allowed opacity-[var(--opacity-disabled)]'}
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
interface GuideViewProps {
  repairData: RepairResponse;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onShowTools: () => void;
  onDownloadPDF: () => void;
  onReset: () => void;
}

const GuideView = ({ repairData, currentStepIndex, onNext, onPrev, onShowTools, onDownloadPDF, onReset }: GuideViewProps) => {
  // Determine current view content based on step index
  // Index -1: Safety Screen
  // Index 0+: Repair Steps

  const isSafetyScreen = currentStepIndex === -1;
  const step = isSafetyScreen ? null : repairData.steps[currentStepIndex];
  const totalSteps = repairData.steps.length;

  // Scroll State for Safety Screen
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const safetyContentRef = useRef<HTMLDivElement>(null);

  const handleSafetyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Check if scrolled to bottom (with small buffer)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolledToBottom(true);
    }
  };

  // Check if we can proceed from safety screen
  // Allow if no safety warnings, or if scrolled to bottom
  const canProceed = !isSafetyScreen || hasScrolledToBottom || repairData.safety.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-950 animate-in fade-in duration-500">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <Wrench size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{repairData.device}</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className={`px-1.5 py-0.5 rounded border ${repairData.source === 'iFixit'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                {repairData.source}
              </span>
              <span>• {totalSteps} Steps</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadPDF}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-400 transition-colors"
            title="Download PDF Guide"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onReset}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-400 transition-colors"
            title="Start new repair"
          >
            <Home size={20} />
          </button>
          <button
            onClick={onShowTools}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-400 transition-colors"
            title="View tools"
          >
            <Hammer size={20} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-black group flex flex-col">
        {isSafetyScreen ? (
          // --- SAFETY SCREEN ---
          <div
            className="flex-1 flex flex-col items-center p-8 pt-32 animate-in slide-in-from-right overflow-y-auto scroll-smooth"
            onScroll={handleSafetyScroll}
            ref={safetyContentRef}
          >
            <div className="max-w-2xl w-full space-y-8 pb-32 px-5">
              <div className="text-center space-y-4">
                <div className="inline-flex p-4 bg-red-500/10 rounded-full mb-2">
                  <AlertTriangle className="w-16 h-16 text-red-500" />
                </div>
                <h2 className="text-3xl font-bold text-white">SAFETY PRECAUTIONS</h2>
                <p className="text-slate-400 text-lg">Please scroll and review these safety warnings before proceeding.</p>
              </div>

              <div className="grid gap-4">
                {repairData.safety.map((warning, i) => (
                  <div key={i} className="bg-white border border-red-500/20 p-4 rounded-xl flex items-start gap-4 shadow-sm">
                    <AlertTriangle className="text-red-600 shrink-0 mt-1" size={20} />
                    <p className="text-slate-900 text-lg font-medium leading-relaxed">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // --- STEP SCREEN ---
          <>
            <div className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                {/* Placeholder for 3D view - can be enhanced with segmentation masks later */}
                <div className="relative w-64 h-80 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl transform transition-all duration-700 ease-out">
                  {/* Generic Machine Shapes */}
                  <div className="absolute bottom-0 w-full h-24 bg-slate-700 rounded-b-lg" />
                  <div className="absolute top-0 w-full h-12 bg-slate-600 rounded-t-lg flex justify-center pt-2">
                    <div className="w-32 h-2 bg-slate-500 rounded-full" />
                  </div>
                  <div className="absolute top-12 left-4 w-12 h-32 bg-slate-600 rounded" />
                  <div className="absolute top-20 right-8 w-16 h-16 rounded-full border-4 border-slate-600" />
                </div>
              </div>
            </div>

            {/* Instructions Panel */}
            <div className="bg-slate-900 border-t border-slate-800 p-6 pb-8 space-y-6 rounded-t-3xl -mt-6 relative z-10 animate-in slide-in-from-bottom duration-500">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-blue-500 text-xs font-bold tracking-wider uppercase mb-1 block">
                      Step {step?.step}
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      {step?.instruction}
                    </h2>
                  </div>
                </div>

                {step?.warning && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={24} />
                    <div>
                      <h3 className="text-yellow-500 font-bold text-lg mb-1">CAUTION</h3>
                      <p className="text-yellow-100 text-base leading-relaxed">{step.warning}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 pb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
          <button
            onClick={onPrev}
            disabled={currentStepIndex === -1} // Disabled only if at safety screen (start)
            className="p-4 rounded-full bg-slate-800 disabled:opacity-30 text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex gap-1.5">
            {/* Safety Dot */}
            <div
              className={`w-2 h-2 rounded-full transition-colors ${currentStepIndex === -1 ? 'bg-red-500' : 'bg-slate-700'
                }`}
            />
            {/* Step Dots */}
            {repairData.steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentStepIndex ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
              />
            ))}
          </div>

          <div className="relative group/tooltip">
            <button
              onClick={onNext}
              disabled={!canProceed || currentStepIndex === totalSteps - 1}
              className={`
                 p-4 rounded-full text-white transition-all shadow-lg
                 ${isSafetyScreen
                  ? canProceed
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }
                 disabled:opacity-30 disabled:cursor-not-allowed
               `}
            >
              {isSafetyScreen ? <ArrowRight size={24} /> : <ChevronRight size={24} />}
            </button>

            {isSafetyScreen && !canProceed && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                Read all precautions to proceed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [showTools, setShowTools] = useState(false);

  // Use Zustand store
  const {
    currentView,
    uploadedImage,
    uploadedFile,
    userDescription,
    repairData,
    analysisLogs,
    isAnalyzing,
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
        // Start at index -1 to show safety screen first, if safety warnings exist
        const hasSafety = response.safety && response.safety.length > 0;
        setCurrentStepIndex(hasSafety ? -1 : 0);
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
    <div className="bg-[#09090b] min-h-screen text-white font-sans selection:bg-blue-500/30">
      {currentView === 'upload' && (
        <UploadView onImageSelect={handleImageSelect} />
      )}

      {currentView === 'diagnosis' && (
        <DiagnosisView
          image={uploadedImage}
          description={userDescription}
          onDescriptionChange={setUserDescription}
          onStartAnalysis={startAnalysis}
          onBack={() => setCurrentView('upload')}
        />
      )}

      {currentView === 'analyzing' && (
        <AnalyzingView logs={analysisLogs} />
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
          onPrev={() => setCurrentStepIndex(Math.max(repairData.safety.length > 0 ? -1 : 0, currentStepIndex - 1))}
          onShowTools={() => setShowTools(true)}
          onDownloadPDF={() => {
            if (!repairData) return;

            // Map RepairResponse to RepairGuide for PDF generation
            const guideForPDF: RepairGuide = {
              device_name: repairData.device,
              steps: repairData.steps.map(s => ({
                step_number: s.step,
                title: `Step ${s.step}`,
                instruction: s.instruction,
                warning: s.warning || undefined,
              })),
              safety: repairData.safety // Pass safety data
            };
            generatePDF(guideForPDF, uploadedImage);
          }}
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