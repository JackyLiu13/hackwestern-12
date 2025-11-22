import { apiClient } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const reconstructionService = {
  /**
   * Reconstruct a 3D model from an image using SAM 3D Objects
   */
  async reconstruct3D(
    imageFile: File,
    maskFile?: File,
    seed: number = 42
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', imageFile);
    if (maskFile) {
      formData.append('mask', maskFile);
    }
    formData.append('seed', seed.toString());

    const response = await fetch(`${API_BASE_URL}/api/v1/reconstruct-3d`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Reconstruction failed: ${response.statusText}`);
    }

    return response.blob();
  },

  /**
   * Check if SAM 3D is available
   */
  async checkStatus(): Promise<{
    available: boolean;
    device: string;
    message: string;
  }> {
    return fetch(`${API_BASE_URL}/api/v1/reconstruct-3d/status`).then((r) =>
      r.json()
    );
  },

  /**
   * Convert blob to URL for viewer
   */
  blobToUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  },

  /**
   * Clean up blob URL
   */
  revokeUrl(url: string): void {
    URL.revokeObjectURL(url);
  },
};
