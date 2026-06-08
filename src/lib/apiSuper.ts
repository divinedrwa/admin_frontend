"use client";

import axios from "axios";
import { getResolvedApiBaseUrl } from "./apiBaseUrl";
import { attemptTokenRefresh } from "./tokenRefresh";
import { parseApiError } from "@/utils/errorHandler";

const API_BASE_URL = getResolvedApiBaseUrl();

export const SUPER_ADMIN_TOKEN_KEY = "super_admin_token";
const SUPER_ADMIN_REFRESH_TOKEN_KEY = "super_admin_refresh_token";

export const apiSuper = axios.create({
  baseURL: API_BASE_URL,
});

apiSuper.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(SUPER_ADMIN_TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiSuper.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== "undefined") {
      const status = error.response?.status;

      // Handle rate limiting (429) - auto-retry once for safe methods
      if (
        status === 429 &&
        !error.config?._retryAfterRateLimit &&
        ["get", "head", "options"].includes(error.config?.method?.toLowerCase() ?? "")
      ) {
        const retryAfterHeader = error.response?.headers?.["retry-after"];
        const parsed = parseInt(retryAfterHeader || "5", 10);
        const retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
        const delayMs = Math.min(retryAfterSeconds * 1000, 30_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        error.config._retryAfterRateLimit = true;
        return apiSuper.request(error.config);
      }

      if (status === 401) {
        // Attempt silent refresh before redirecting to login.
        if (!error.config?._retryAfterRefresh) {
          const newToken = await attemptTokenRefresh({
            tokenKey: SUPER_ADMIN_TOKEN_KEY,
            refreshTokenKey: SUPER_ADMIN_REFRESH_TOKEN_KEY,
          });
          if (newToken) {
            error.config._retryAfterRefresh = true;
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return apiSuper.request(error.config);
          }
        }

        // Refresh failed — clear and redirect.
        localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
        localStorage.removeItem(SUPER_ADMIN_REFRESH_TOKEN_KEY);
        if (!window.location.pathname.startsWith("/super-admin/login")) {
          window.location.href = "/super-admin/login";
        }
      }
    }
    // Enrich error with parsed message (same as tenant client)
    const enriched = Object.assign(error, {
      parsedMessage: parseApiError(error).message,
    });
    return Promise.reject(enriched);
  },
);
