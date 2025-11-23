import React, { useState, useRef, useEffect } from 'react';
import {
    Wrench,
    Download,
    Home,
    Hammer,
    AlertTriangle,
    CheckCircle2,
    Scan,
    ChevronLeft,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import type { RepairResponse } from '@/lib/api/types';

interface GuideViewProps {
    repairData: RepairResponse;
    currentStepIndex: number;
    onNext: () => void;
    onPrev: () => void;
    onShowTools: () => void;
    onDownloadPDF: () => void;
    onReset: () => void;
}

export const GuideView = ({ repairData, currentStepIndex, onNext, onPrev, onShowTools, onDownloadPDF, onReset }: GuideViewProps) => {
    // Determine current view content based on step index
    // Index -1: Safety Screen
    // Index 0+: Repair Steps

    const isSafetyScreen = currentStepIndex === -1;
    const step = isSafetyScreen ? null : repairData.steps[currentStepIndex];
    const totalSteps = repairData.steps.length;

    // Scroll State for Safety Screen
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const safetyContentRef = useRef<HTMLDivElement>(null);

    // Check if content is scrollable on mount/update
    useEffect(() => {
        if (isSafetyScreen && safetyContentRef.current) {
            const { scrollHeight, clientHeight } = safetyContentRef.current;
            if (scrollHeight <= clientHeight + 10) { // Small buffer
                setHasScrolledToBottom(true);
            }
        }
    }, [isSafetyScreen, repairData]);

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

                            {/* Explicit Acknowledge Button */}
                            <div className="pt-8 flex justify-center">
                                <button
                                    onClick={() => {
                                        setHasScrolledToBottom(true);
                                        onNext();
                                    }}
                                    className={`
                    px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2
                    ${hasScrolledToBottom
                                            ? 'bg-green-600 text-white hover:bg-green-500'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }
                  `}
                                >
                                    {hasScrolledToBottom ? <CheckCircle2 size={20} /> : <Scan size={20} />}
                                    {hasScrolledToBottom ? 'Safety Reviewed' : 'I Understand the Risks'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- STEP SCREEN ---
                    <>
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                {step?.demoHtml ? (
                                    // Render demo HTML in iframe
                                    <iframe
                                        src={step.demoHtml}
                                        className="w-full h-full border-0"
                                        title={`3D Visualization - Step ${step.step}`}
                                    />
                                ) : (
                                    // Generic placeholder for non-demo steps
                                    <div className="relative w-64 h-80 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl transform transition-all duration-700 ease-out">
                                        {/* Generic Machine Shapes */}
                                        <div className="absolute bottom-0 w-full h-24 bg-slate-700 rounded-b-lg" />
                                        <div className="absolute top-0 w-full h-12 bg-slate-600 rounded-t-lg flex justify-center pt-2">
                                            <div className="w-32 h-2 bg-slate-500 rounded-full" />
                                        </div>
                                        <div className="absolute top-12 left-4 w-12 h-32 bg-slate-600 rounded" />
                                        <div className="absolute top-20 right-8 w-16 h-16 rounded-full border-4 border-slate-600" />
                                    </div>
                                )}
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
