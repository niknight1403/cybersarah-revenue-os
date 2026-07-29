import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Typen ──────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

// ─── Basis-URL ──────────────────────────────────────────────────────
// Nutze die Server-IP direkt + Fallback-Domain
const BASE_URL = __DEV__
  ? 'http://167.233.196.20:3000/api'
  : 'https://cybersarah.app/api';

const API_TIMEOUT = 30000;
const MAX_RETRIES = 2;

// ─── Token-Management ──────────────────────────────────────────────
let authToken: string | null = null;
let tokenRefreshPromise: Promise<string | null> | null = null;

async function getTokenFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('@cybersarah/auth_token');
  } catch {
    return null;
  }
}

async function refreshToken(): Promise<string | null> {
  try {
    const token = authToken ?? (await getTokenFromStorage());
    if (!token) return null;
    const response = await axios.post<ApiResponse<{ token: string }>>(
      `${BASE_URL}/auth/refresh`, {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const newToken = response.data.data.token;
    await AsyncStorage.setItem('@cybersarah/auth_token', newToken);
    authToken = newToken;
    return newToken;
  } catch {
    authToken = null;
    await AsyncStorage.multiRemove(['@cybersarah/auth_token', '@cybersarah/auth_user']);
    return null;
  }
}

// ─── Axios-Instanz ─────────────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// ─── Request-Interceptor: Token anhängen ───────────────────────────
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = authToken ?? (await getTokenFromStorage());
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response-Interceptor: Token-Refresh bei 401 ───────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
    else prom.reject(new Error('Token-Refresh fehlgeschlagen'));
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        tokenRefreshPromise = refreshToken();
        const newToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;
        if (newToken) {
          processQueue(null, newToken);
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
        processQueue(new Error('Token-Refresh fehlgeschlagen'), null);
        return Promise.reject(error);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }

    if (!error.response && (originalRequest._retryCount ?? 0) < MAX_RETRIES && !originalRequest._retry) {
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;
      return new Promise((resolve) => setTimeout(resolve, 1000 * (originalRequest._retryCount ?? 1)))
        .then(() => axiosInstance(originalRequest));
    }

    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'Ein Fehler ist aufgetreten',
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 0,
      details: error.response?.data?.details,
    };
    return Promise.reject(apiError);
  },
);

// ─── API-Client ────────────────────────────────────────────────────
class ApiClient {
  private instance: AxiosInstance;
  constructor(instance: AxiosInstance) { this.instance = instance; }

  setAuthToken(token: string): void { authToken = token; }
  clearAuthToken(): void { authToken = null; }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }
  async upload<T = unknown>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      },
    });
    return response.data.data;
  }
}

export const apiClient = new ApiClient(axiosInstance);
export default apiClient;
