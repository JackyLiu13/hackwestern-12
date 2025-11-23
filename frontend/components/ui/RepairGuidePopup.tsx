'use client';
import React from 'react';
import { ChevronRight, ChevronLeft, Wrench, X } from 'lucide-react';

interface RepairGuidePopupProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const steps = [
  {
    title: "Tighten the Handle Fit",
    color: "text-red-400",
    borderColor: "border-red-500/30",
    glowColor: "shadow-red-500/20",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Remove any debris from the hole in the hammer head.
        </p>
        <p className="text-sm text-gray-300">
          Tap the hammer head firmly back onto the wooden handle using a mallet or by hitting the hammer on a solid surface.
        </p>
      </div>
    )
  },
  {
    title: "Insert a Wooden Wedge",
    color: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    glowColor: "shadow-yellow-500/20",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Add a wood wedge into the top slit of the handle (most wooden hammers have one).
        </p>
        <p className="text-sm text-gray-300">
          Hammer the wedge in until the head feels locked in place.
        </p>
        <p className="text-sm text-gray-300">
          Trim any excess wedge material sticking out.
        </p>
      </div>
    )
  },
  {
    title: "Reinforce With Metal or Glue",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    glowColor: "shadow-green-500/20",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-300 mb-2">Choose one depending on what you have:</p>
        <ul className="list-disc pl-4 space-y-2 text-sm text-gray-300">
          <li>
            <strong className="text-white">Metal wedge:</strong> Drive it in perpendicular to the wooden wedge for extra grip.
          </li>
          <li>
            <strong className="text-white">Wood glue / epoxy:</strong> Drip glue into the top opening to seal the wood and expand the fit. Let dry fully.
          </li>
        </ul>
      </div>
    )
  }
];

export const RepairGuidePopup = ({ step, onNext, onPrev, onClose }: RepairGuidePopupProps) => {
  // Ensure step is within bounds (1-based index from props, 0-based for array)
  const currentStepIndex = Math.max(0, Math.min(step - 1, steps.length - 1));
  const currentStep = steps[currentStepIndex];

  return (
    <div className="absolute top-1/2 right-12 -translate-y-1/2 z-50 w-96 animate-in slide-in-from-right fade-in duration-500">
      <div className={`
        relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-black/40 shadow-2xl transition-all duration-500
        ${currentStep.borderColor} ${currentStep.glowColor}
      `}>
        {/* Glass Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/5 ${currentStep.color}`}>
              <Wrench size={20} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Step {step} of {steps.length}
              </div>
              <h3 className={`text-lg font-bold ${currentStep.color}`}>
                {currentStep.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-6 min-h-[200px]">
          {currentStep.content}
        </div>

        {/* Footer / Navigation */}
        <div className="relative p-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={step === 1}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? `w-4 ${currentStep.color.replace('text-', 'bg-')}` : 'bg-gray-600'
                  }`}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            disabled={step === steps.length}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
