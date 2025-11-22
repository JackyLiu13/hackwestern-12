import { create } from 'zustand';
import type { RepairResponse, MaskData } from '@/lib/api/types';

export interface Step {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface AppState {
  // Existing fields (keep for compatibility)
  images: File[];
  mask: string | null;
  blueprint: {
    top: string;
    front: string;
    side: string;
    iso: string;
  };
  steps: Step[];
  modelUrl: string;

  // New fields for API integration
  currentView: 'upload' | 'diagnosis' | 'analyzing' | 'guide';
  uploadedImage: string | null;
  uploadedFile: File | null;
  userDescription: string;

  // API data
  repairData: RepairResponse | null;
  segmentationMasks: MaskData[] | null;
  analysisLogs: string[];

  // UI states
  isAnalyzing: boolean;
  isLoadingMasks: boolean;
  error: string | null;

  // Current step navigation
  currentStepIndex: number;

  // Actions
  setImages: (images: File[]) => void;
  setMask: (mask: string) => void;
  setBlueprint: (blueprint: AppState['blueprint']) => void;
  setSteps: (steps: Step[]) => void;
  setModelUrl: (url: string) => void;

  // New actions
  setCurrentView: (view: AppState['currentView']) => void;
  setUploadedImage: (image: string | null, file: File | null) => void;
  setUserDescription: (desc: string) => void;
  setRepairData: (data: RepairResponse | null) => void;
  setSegmentationMasks: (masks: MaskData[] | null) => void;
  addAnalysisLog: (log: string) => void;
  clearAnalysisLogs: () => void;
  setIsAnalyzing: (status: boolean) => void;
  setIsLoadingMasks: (status: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentStepIndex: (index: number) => void;
  resetState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Existing state
  images: [],
  mask: null,
  blueprint: {
    top: '/mock/top.svg',
    front: '/mock/front.svg',
    side: '/mock/side.svg',
    iso: '/mock/iso.svg',
  },
  steps: [],
  modelUrl: '/mock/model.glb',

  // New state
  currentView: 'upload',
  uploadedImage: null,
  uploadedFile: null,
  userDescription: '',
  repairData: null,
  segmentationMasks: null,
  analysisLogs: [],
  isAnalyzing: false,
  isLoadingMasks: false,
  error: null,
  currentStepIndex: 0,

  // Existing actions
  setImages: (images) => set({ images }),
  setMask: (mask) => set({ mask }),
  setBlueprint: (blueprint) => set({ blueprint }),
  setSteps: (steps) => set({ steps }),
  setModelUrl: (modelUrl) => set({ modelUrl }),

  // New actions
  setCurrentView: (view) => set({ currentView: view }),
  setUploadedImage: (image, file) =>
    set({
      uploadedImage: image,
      uploadedFile: file,
    }),
  setUserDescription: (desc) => set({ userDescription: desc }),
  setRepairData: (data) => set({ repairData: data }),
  setSegmentationMasks: (masks) => set({ segmentationMasks: masks }),
  addAnalysisLog: (log) =>
    set((state) => ({
      analysisLogs: [...state.analysisLogs, log],
    })),
  clearAnalysisLogs: () => set({ analysisLogs: [] }),
  setIsAnalyzing: (status) => set({ isAnalyzing: status }),
  setIsLoadingMasks: (status) => set({ isLoadingMasks: status }),
  setError: (error) => set({ error }),
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  resetState: () =>
    set({
      currentView: 'upload',
      uploadedImage: null,
      uploadedFile: null,
      userDescription: '',
      repairData: null,
      segmentationMasks: null,
      analysisLogs: [],
      isAnalyzing: false,
      isLoadingMasks: false,
      error: null,
      currentStepIndex: 0,
    }),
}));
