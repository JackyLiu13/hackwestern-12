import { apiClient } from './client';
import type {
  AnalyzeRequest,
  RepairResponse,
  SegmentRequest,
  SegmentResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
   * Analyzes an image with real-time log streaming
   * @param request - The analysis request
   * @param onLog - Callback fired for each log message
   * @returns Promise that resolves with the final result
   */
  async analyzeStreaming(
    request: AnalyzeRequest,
    onLog: (message: string) => void
  ): Promise<RepairResponse> {
    const formData = new FormData();
    formData.append('file', request.file);

    if (request.user_prompt) {
      formData.append('user_prompt', request.user_prompt);
    }

    return new Promise((resolve, reject) => {
      fetch(`${API_BASE_URL}/api/v1/analyze-stream`, {
        method: 'POST',
        body: formData,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let isResolved = false;

          async function processStream(): Promise<void> {
            if (isResolved) return;
            
            try {
              const { done, value } = await reader.read();
              
              if (done) {
                return;
              }

              // Decode chunk and add to buffer
              buffer += decoder.decode(value, { stream: true });
              
              // Split by double newline (SSE message separator)
              const messages = buffer.split('\n\n');
              
              // Keep last incomplete message in buffer
              buffer = messages.pop() || '';

              // Process complete messages
              for (const message of messages) {
                if (message.startsWith('data: ')) {
                  const data = message.substring(6).trim();
                  
                  if (!data) continue;
                  
                  try {
                    const event = JSON.parse(data);

                    if (event.type === 'log') {
                      onLog(event.data);
                    } else if (event.type === 'result') {
                      isResolved = true;
                      resolve(event.data);
                      return;
                    } else if (event.type === 'error') {
                      isResolved = true;
                      const errorMsg = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
                      reject(new Error(errorMsg));
                      return;
                    }
                  } catch (e) {
                    console.error('Failed to parse SSE data:', data, e);
                  }
                }
              }

              // Continue reading
              await processStream();
            } catch (error) {
              if (!isResolved) {
                isResolved = true;
                reject(error);
              }
            }
          }

          await processStream();
        })
        .catch((error) => {
          reject(error);
        });
    });
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

