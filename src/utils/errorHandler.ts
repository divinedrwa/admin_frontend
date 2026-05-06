import { showToast } from "@/components/Toast";

export function handleApiError(error: unknown, customMessage?: string) {
  const status = (error as any)?.response?.status;
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  
  // Don't show toast for auth errors (handled by interceptor)
  if (status === 401 || status === 403) {
    console.error("Authentication/Authorization error:", message);
    return;
  }
  
  // Show toast for other errors
  showToast(customMessage ?? message ?? "An error occurred", "error");
}

export function isAuthError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  return status === 401 || status === 403;
}
