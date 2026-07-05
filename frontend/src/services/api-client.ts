import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshTokenHandler(handler: (() => Promise<string | null>) | null): void {
  refreshTokenHandler = handler;
}

function clearSessionAndRedirect(): void {
  setAccessToken(null);
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

// Default refresh handler: rotates the stored refresh token for a new access
// token so the 15-minute JWT (rules.md) doesn't silently strand the user mid-session.
setRefreshTokenHandler(async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    clearSessionAndRedirect();
    return null;
  }

  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken
    });
    setAccessToken(data.access_token);
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return data.access_token as string;
  } catch {
    clearSessionAndRedirect();
    return null;
  }
});
