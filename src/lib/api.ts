"use client";

import axios from "axios";
import { parseApiError } from "@/utils/errorHandler";
import { isSocietyPublicAuthPath } from "./authRedirect";
import { clearPlatformViewSession } from "./platformViewSession";
import { getResolvedApiBaseUrl } from "./apiBaseUrl";
import { attemptTokenRefresh } from "./tokenRefresh";
import { readSocietyIdFromToken } from "./jwt";
import { isHttpOnlyAuthEnabled } from "./httpOnlyAuth";

const TENANT_SOCIETY_STORAGE_KEY = "tenant_society_id";
const TENANT_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const API_BASE_URL = getResolvedApiBaseUrl();

/** Persisted after society-admin login so [api] can send X-Society-Id on tenant requests. */
export function setTenantSocietyIdFromLogin(user: { societyId?: string | null } | undefined): void {
  const sid = user?.societyId?.trim();
  if (typeof window !== "undefined" && sid) {
    localStorage.setItem(TENANT_SOCIETY_STORAGE_KEY, sid);
  }
}

export function setTenantAuthCookie(): void {
  if (typeof window !== "undefined") {
    document.cookie = `tenant_auth=1; path=/; max-age=${TENANT_AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function clearTenantAuthCookie(): void {
  if (typeof window !== "undefined") {
    document.cookie = "tenant_auth=; path=/; max-age=0; SameSite=Lax";
  }
}

export function clearTenantSocietyId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TENANT_SOCIETY_STORAGE_KEY);
  }
}


export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Re-resolve each request so dev `.env.local` changes apply without a full rebuild.
  config.baseURL = getResolvedApiBaseUrl();
  const token =
    typeof window !== "undefined" && !isHttpOnlyAuthEnabled()
      ? localStorage.getItem("token")
      : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const tokenSocietyId = token ? readSocietyIdFromToken(token) : null;
    const storedSocietyId = localStorage.getItem(TENANT_SOCIETY_STORAGE_KEY)?.trim() ?? "";
    const societyHeader = tokenSocietyId ?? storedSocietyId;
    if (societyHeader) {
      if (tokenSocietyId && storedSocietyId !== tokenSocietyId) {
        localStorage.setItem(TENANT_SOCIETY_STORAGE_KEY, tokenSocietyId);
      }
      config.headers["X-Society-Id"] = societyHeader;
    } else {
      if (storedSocietyId) clearTenantSocietyId();
      delete config.headers["X-Society-Id"];
    }
  }
  return config;
});

const TENANT_REFRESH_TOKEN_KEY = "refresh_token";

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enrich every rejected error with a Zod-aware parsed message. Pages
    // that read `error.response.data.message` get a message that now folds
    // in `issues[]` when present (~30 pages historically dropped them).
    // Pages that prefer field-level errors can read `error.parsedApiError`.
    try {
      const parsed = parseApiError(error);
      (error as { parsedApiError?: typeof parsed }).parsedApiError = parsed;
      if (error.response?.data && typeof error.response.data === "object") {
        (error.response.data as { message?: string }).message = parsed.message;
      }
    } catch {
      // Parsing must never itself reject the original error.
    }

    if (typeof window !== "undefined") {
      const status = error.response?.status;

      // Handle rate limiting (429) - auto-retry once for safe (idempotent) methods only
      if (
        status === 429 &&
        !error.config?._retryAfterRateLimit &&
        ["get", "head", "options"].includes(error.config?.method?.toLowerCase() ?? "")
      ) {
        const retryAfterHeader = error.response?.headers?.["retry-after"];
        const parsed = parseInt(retryAfterHeader || "5", 10);
        const retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

        // Cap at 30s so the UI doesn't feel frozen
        const delayMs = Math.min(retryAfterSeconds * 1000, 30_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        error.config._retryAfterRateLimit = true;
        return api.request(error.config);
      }

      // Handle authentication errors — attempt silent refresh before logout.
      if (status === 401) {
        const path = window.location.pathname;

        // Don't attempt refresh on login/invite/super-admin pages.
        if (!isSocietyPublicAuthPath(path) && !error.config?._retryAfterRefresh) {
          const newToken = await attemptTokenRefresh({
            tokenKey: "token",
            refreshTokenKey: TENANT_REFRESH_TOKEN_KEY,
          });
          if (newToken) {
            // Retry the original request with the new token.
            error.config._retryAfterRefresh = true;
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return api.request(error.config);
          }
        }

        // Refresh failed or not applicable — clear session and redirect.
        // Session expired — silently redirect to login.
        localStorage.removeItem("token");
        localStorage.removeItem(TENANT_REFRESH_TOKEN_KEY);
        clearPlatformViewSession();
        clearTenantSocietyId();

        if (isSocietyPublicAuthPath(path)) {
          return Promise.reject(error);
        }
        if (path !== "/login") {
          window.location.href = "/login";
        }
      }

      // 403 and 5xx are handled by the calling code via parseApiError().
    }
    return Promise.reject(error);
  }
);
