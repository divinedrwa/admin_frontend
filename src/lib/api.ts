"use client";

import axios from "axios";
import { isSocietyPublicAuthPath } from "./authRedirect";
import { clearPlatformViewSession } from "./platformViewSession";
import { getResolvedApiBaseUrl } from "./apiBaseUrl";

const TENANT_SOCIETY_STORAGE_KEY = "tenant_society_id";

const API_BASE_URL = getResolvedApiBaseUrl();

/** Persisted after society-admin login so [api] can send X-Society-Id on tenant requests. */
export function setTenantSocietyIdFromLogin(user: { societyId?: string | null } | undefined): void {
  const sid = user?.societyId?.trim();
  if (typeof window !== "undefined" && sid) {
    localStorage.setItem(TENANT_SOCIETY_STORAGE_KEY, sid);
  }
}

export function clearTenantSocietyId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TENANT_SOCIETY_STORAGE_KEY);
  }
}

function readSocietyIdFromToken(token: string | null): string {
  if (!token) return "";
  const parts = token.split(".");
  if (parts.length < 2) return "";
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { societyId?: unknown };
    const sid = typeof payload.societyId === "string" ? payload.societyId.trim() : "";
    return sid;
  } catch {
    return "";
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL
});

function extractApiMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data.trim() || undefined;
  if (typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }
  return undefined;
}

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const tokenSocietyId = readSocietyIdFromToken(token);
    const storedSocietyId = localStorage.getItem(TENANT_SOCIETY_STORAGE_KEY)?.trim() ?? "";

    // Source of truth is JWT tenant claim; storage is only a convenience cache.
    if (tokenSocietyId) {
      if (storedSocietyId !== tokenSocietyId) {
        localStorage.setItem(TENANT_SOCIETY_STORAGE_KEY, tokenSocietyId);
      }
      config.headers["X-Society-Id"] = tokenSocietyId;
    } else {
      // Super-admin / public session should never send tenant context.
      if (storedSocietyId) {
        clearTenantSocietyId();
      }
      delete config.headers["X-Society-Id"];
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error.response?.status;
      const message = extractApiMessage(error.response?.data) ?? error.message ?? "Unknown error";
      const url = error.config?.url;
      
      // Handle authentication errors
      if (status === 401) {
        console.warn(`Authentication failed (${status}) on ${url ?? "unknown endpoint"}: ${message}`);
        localStorage.removeItem("token");
        clearPlatformViewSession();
        clearTenantSocietyId();

        const path = window.location.pathname;
        // Super-admin flows use apiSuper — but avoid hijacking redirects on public/super-admin pages.
        if (isSocietyPublicAuthPath(path)) {
          return Promise.reject(error);
        }
        if (path !== "/login") {
          window.location.href = "/login";
        }
      }
      
      // Handle authorization errors (403)
      // These are logged but not shown as toasts - individual pages handle them
      if (status === 403) {
        console.warn(`Access forbidden (${status}) on ${url ?? "unknown endpoint"}: ${message}`);
      }
      
      // Handle server errors
      if (status >= 500) {
        console.error(`Server error (${status}) on ${url ?? "unknown endpoint"}: ${message}`);
      }
    }
    return Promise.reject(error);
  }
);
