"use client";

import axios from "axios";
import { getResolvedApiBaseUrl } from "./apiBaseUrl";

const API_BASE_URL = getResolvedApiBaseUrl();

export const SUPER_ADMIN_TOKEN_KEY = "super_admin_token";

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
  (error) => {
    if (typeof window !== "undefined") {
      const status = error.response?.status;
      if (status === 401) {
        localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
        if (!window.location.pathname.startsWith("/super-admin/login")) {
          window.location.href = "/super-admin/login";
        }
      }
    }
    return Promise.reject(error);
  },
);
