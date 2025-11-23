// API Request Types
export interface AnalyzeRequest {
  file: File;
  user_prompt?: string;
}

export interface SegmentRequest {
  file: File;
}

// API Response Types
export interface RepairStep {
  step: number;
  instruction: string;
  warning?: string | null;
}

export interface iFixitGuide {
  title: string;
  url?: string;
  guideid: number;
  subject?: string;
  thumbnail?: string;
}

export interface RepairResponse {
  source: "iFixit" | "AI_Reasoning";
  device: string;
  steps: RepairStep[];
  safety: string[];
  guides_available?: iFixitGuide[] | null;
  reasoning_log: string[];
  model_url?: string | null;
}

export interface MaskData {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
  polygon: [number, number][];
}

export interface SegmentResponse {
  masks: MaskData[];
}

export interface ApiError {
  detail: string;
  status?: number;
}

