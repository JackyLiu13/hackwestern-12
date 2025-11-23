import React from 'react';
import { Home, CheckCircle2, Upload, Scan } from 'lucide-react';

interface DiagnosisViewProps {
    image: string | null;
    description: string;
    onDescriptionChange: (value: string) => void;
    onStartAnalysis: () => void;
    onBack: () => void;
    onReplaceImage: () => void;
}

export const DiagnosisView = ({
    image,
    description,
    onDescriptionChange,
    onStartAnalysis,
    onBack,
    onReplaceImage
}: DiagnosisViewProps) => (
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
