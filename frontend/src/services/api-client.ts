import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

let accessToken: string | null = null;
let refreshTokenHandler: (() => Promise<string | null>) | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401 || !refreshTokenHandler || !error.config) {
      throw error;
    }

    const nextToken = await refreshTokenHandler();
    if (!nextToken) {
      throw error;
    }

    setAccessToken(nextToken);
    error.config.headers.Authorization = `Bearer ${nextToken}`;
    return apiClient.request(error.config);
  }
);

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshTokenHandler(handler: (() => Promise<string | null>) | null): void {
  refreshTokenHandler = handler;
}
