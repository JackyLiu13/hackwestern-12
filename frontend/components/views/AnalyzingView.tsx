import React from 'react';
import { Home, Cpu } from 'lucide-react';

interface AnalyzingViewProps {
    logs: string[];
    onHome: () => void;
}

export const AnalyzingView = ({ logs, onHome }: AnalyzingViewProps) => (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)]">
        {/* Header with Home button */}
        <header className="relative z-10 px-8 py-6 flex items-center justify-between">
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
