/**
 * API Client
 * 
 * Axios-based HTTP client for API communication.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG, APP_CONFIG } from '@/constants/config';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';
import { APIResponse } from '@/types';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request in development
        if (APP_CONFIG.ENABLE_LOGGING) {
          console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
        }

        return config;
      },
      (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log response in development
        if (APP_CONFIG.ENABLE_LOGGING) {
          console.log('📥 API Response:', response.config.url, response.status);
        }

        return response;
      },
      async (error) => {
        console.error('❌ Response error:', error.response?.status, error.config?.url);

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          // Clear auth data
          await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          await storage.remove(STORAGE_KEYS.USER_PROFILE);
          
          // Redirect to login (handled by navigation)
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.get(
        url,
        config
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.post(
        url,
        data,
        config
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.put(
        url,
        data,
        config
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.patch(
        url,
        data,
        config
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.delete(
        url,
        config
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Upload file
   */
  async upload<T = any>(
    url: string,
    file: FormData,
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.client.post(
        url,
        file,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(progress);
            }
          },
        }
      );
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): APIResponse {
    if (error.response) {
      // Server responded with error
      return {
        success: false,
        error: error.response.data?.error || 'Server error',
        message: error.response.data?.message || error.message,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'Network error',
        message: 'No response from server. Please check your internet connection.',
      };
    } else {
      // Error in request setup
      return {
        success: false,
        error: 'Request error',
        message: error.message || 'Failed to make request',
      };
    }
  }
}

export const api = new APIClient();
export default api;
