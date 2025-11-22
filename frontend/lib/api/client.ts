const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async post<T>(
    endpoint: string,
    body: FormData | Record<string, any>,
    options?: RequestInit
  ): Promise<T> {
    const isFormData = body instanceof FormData;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? body : JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Network error occurred',
      }));
      throw {
        detail: error.detail || 'Request failed',
        status: response.status,
      };
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Network error occurred',
      }));
      throw {
        detail: error.detail || 'Request failed',
        status: response.status,
      };
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();

