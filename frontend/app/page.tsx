'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { repairService } from '@/lib/api/repairService';
import type { ApiError } from '@/lib/api/types';
import { generatePDF } from '@/lib/pdfGenerator';
import { RepairGuide } from '@/types/repair';

// Imported Views
import { UploadView } from '@/components/views/UploadView';
import { DiagnosisView } from '@/components/views/DiagnosisView';
import { AnalyzingView } from '@/components/views/AnalyzingView';
import { GuideView } from '@/components/views/GuideView';

/**
 * REPAIRLENS - HYBRID IMPLEMENTATION
 * * Visual Style & Upload Logic: Adapted from your 'Explode Anything' tool (page.tsx).
 * * Core Logic: RepairLens Workflow (Upload -> Diagnosis -> Analysis -> Guide).
 */

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
          onBack={() => setCurrentView('upload')}
          onReplaceImage={() => fileInputRef.current?.click()}
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