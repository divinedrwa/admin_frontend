"use client";

import axios from "axios";
import { getResolvedApiBaseUrl } from "./apiBaseUrl";

const API_BASE_URL = getResolvedApiBaseUrl();

type RefreshConfig = {
  /** localStorage key for the access token (e.g. "token" or "super_admin_token") */
  tokenKey: string;
  /** localStorage key for the refresh token */
  refreshTokenKey: string;
};

/** Per-client mutex so concurrent 401s share a single refresh call. */
const inflight = new Map<string, Promise<string | null>>();

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 * Concurrent calls for the same tokenKey are coalesced.
 */
export async function attemptTokenRefresh(config: RefreshConfig): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const existing = inflight.get(config.tokenKey);
  if (existing) return existing;

  const promise = doRefresh(config);
  inflight.set(config.tokenKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(config.tokenKey);
  }
}

async function doRefresh(config: RefreshConfig): Promise<string | null> {
  const refreshToken = localStorage.getItem(config.refreshTokenKey);
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{
      token?: string;
      refreshToken?: string;
    }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });

    const newAccess = data?.token;
    const newRefresh = data?.refreshToken;
    if (!newAccess || !newRefresh) return null;

    localStorage.setItem(config.tokenKey, newAccess);
    localStorage.setItem(config.refreshTokenKey, newRefresh);
    return newAccess;
  } catch {
    // Refresh failed — clear both tokens so caller falls through to redirect.
    localStorage.removeItem(config.refreshTokenKey);
    return null;
  }
}
