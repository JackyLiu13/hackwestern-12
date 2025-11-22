import { apiClient } from './client';
import type {
  AnalyzeRequest,
  RepairResponse,
  SegmentRequest,
  SegmentResponse,
} from './types';

export const repairService = {
  /**
   * Analyzes an image and returns repair steps
   */
  async analyze(request: AnalyzeRequest): Promise<RepairResponse> {
    const formData = new FormData();
    formData.append('file', request.file);

    if (request.user_prompt) {
      formData.append('user_prompt', request.user_prompt);
    }

    return apiClient.post<RepairResponse>('/api/v1/analyze', formData);
  },

  /**
   * Generates segmentation masks for exploded view
   */
  async segment(request: SegmentRequest): Promise<SegmentResponse> {
    const formData = new FormData();
    formData.append('file', request.file);

    return apiClient.post<SegmentResponse>('/api/v1/segment', formData);
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ message: string; status: string }> {
    return apiClient.get('/');
  },
};

