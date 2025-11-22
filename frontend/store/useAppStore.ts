import { create } from 'zustand'

export interface Step {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface AppState {
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
  
  setImages: (images: File[]) => void;
  setMask: (mask: string) => void;
  setBlueprint: (blueprint: AppState['blueprint']) => void;
  setSteps: (steps: Step[]) => void;
  setModelUrl: (url: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
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

  setImages: (images) => set({ images }),
  setMask: (mask) => set({ mask }),
  setBlueprint: (blueprint) => set({ blueprint }),
  setSteps: (steps) => set({ steps }),
  setModelUrl: (modelUrl) => set({ modelUrl }),
}))
