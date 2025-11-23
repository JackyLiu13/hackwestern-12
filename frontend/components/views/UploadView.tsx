'use client';
import React, { useState, useRef } from 'react';
import { HammerBackground } from '@/components/3d/HammerBackground';
import { RepairGuidePopup } from '@/components/ui/RepairGuidePopup';
import { Camera } from 'lucide-react';

interface UploadViewProps {
    onImageSelect: (imageData: string, file: File) => void;
}

export const UploadView = ({ onImageSelect }: UploadViewProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showRepairGuide, setShowRepairGuide] = useState(false);
    const [repairStep, setRepairStep] = useState(1);

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
            <HammerBackground
                onPartClick={() => setShowRepairGuide(true)}
                step={showRepairGuide ? repairStep : 0}
            />

            {/* Repair Guide Popup */}
            {showRepairGuide && (
                <RepairGuidePopup
                    step={repairStep}
                    onNext={() => setRepairStep(prev => prev + 1)}
                    onPrev={() => setRepairStep(prev => prev - 1)}
                    onClose={() => {
                        setShowRepairGuide(false);
                        setRepairStep(1);
                    }}
                />
            )}

            {/* Header */}
            <header className="relative z-10 px-8 py-6 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <h1 className="text-4xl font-bold tracking-tight text-chrome">
                        RepairLens
                    </h1>
                </div>
                <p className="text-md text-chrome pointer-events-auto">
                    Upload a photo of what's broken. We'll tell you how to fix it.
                </p>
            </header>

            {/* Main Content - Spacer */}
            <div className="flex-1 relative z-10 pointer-events-none"></div>

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
