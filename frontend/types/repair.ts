export interface Step {
  step_number: number;
  title: string;
  instruction: string;
  warning?: string;
  tools_needed?: string[];
  mask_id?: string;
  overlay?: { type: string; x: number; y: number };
  image?: string; // Optional image URL/Base64
}

export interface RepairGuide {
  device_name: string;
  difficulty?: string;
  tools_needed?: string[];
  steps: Step[];
  safety?: string[]; // Added safety field
}

