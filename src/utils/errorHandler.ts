import { showToast } from "@/components/Toast";

/** A single Zod issue as the backend returns it. */
type ApiErrorIssue = {
  /** Path elements like `["body", "email"]` or `["amount"]`. */
  path?: Array<string | number>;
  message?: string;
};

export type ParsedApiError = {
  /** Human-readable summary suitable for a toast. Combines the top-level
   *  `message` with any `issues[]` entries when both are present. */
  message: string;
  /** Per-field messages keyed by dotted path (best-effort). Empty when the
   *  backend did not return Zod `issues[]`. Use this to show form-field
   *  errors next to the input that failed. */
  fieldErrors: Record<string, string>;
  /** HTTP status if the error was an axios response error. */
  status?: number;
};

/** Drop the leading "body" / "params" / "query" wrappers Zod adds when
 *  validating express requests, so callers can match by the user-facing
 *  field name (`email`) rather than the internal middleware path
 *  (`body.email`). */
function normalizePath(path?: Array<string | number>): string {
  if (!path || path.length === 0) return "";
  const head = String(path[0]);
  const rest =
    head === "body" || head === "params" || head === "query"
      ? path.slice(1)
      : path;
  return rest.map(String).join(".");
}

/**
 * Single source of truth for translating an axios/network error into a
 * displayable shape. Use this from every page so server-side Zod
 * `issues[]` arrays don't get dropped.
 */
export function parseApiError(error: unknown, fallback = "An error occurred"): ParsedApiError {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  const fieldErrors: Record<string, string> = {};
  let topLevel = "";
  let issuesSummary = "";

  if (data && typeof data === "object") {
    const m = (data as { message?: unknown }).message;
    if (typeof m === "string" && m.trim().length > 0) topLevel = m.trim();

    const issues = (data as { issues?: unknown }).issues;
    if (Array.isArray(issues)) {
      const lines: string[] = [];
      for (const raw of issues) {
        if (!raw || typeof raw !== "object") continue;
        const issue = raw as ApiErrorIssue;
        const path = normalizePath(issue.path);
        const msg = (issue.message ?? "").trim();
        if (!msg) continue;
        if (path) {
          if (!fieldErrors[path]) fieldErrors[path] = msg;
          lines.push(`${path}: ${msg}`);
        } else {
          lines.push(msg);
        }
      }
      issuesSummary = lines.join(" · ");
    }
  } else if (typeof data === "string" && data.trim().length > 0) {
    topLevel = data.trim();
  }

  let message = topLevel || (error as { message?: string })?.message || fallback;
  if (issuesSummary) {
    // Avoid "Validation failed: foo: required · foo: required" duplication
    // when the top-level message is the generic Zod label.
    message =
      topLevel && topLevel.toLowerCase() !== "validation failed"
        ? `${topLevel} — ${issuesSummary}`
        : issuesSummary;
  }

  return { message, fieldErrors, status };
}

/**
 * Existing helper kept as a thin wrapper so older call sites continue to
 * work; the parser now picks up `issues[]` automatically.
 */
export function handleApiError(error: unknown, customMessage?: string) {
  const parsed = parseApiError(error, customMessage);

  // Auth errors are handled by the api.ts response interceptor (logout +
  // redirect). Don't double up with a toast.
  if (parsed.status === 401 || parsed.status === 403) {
    console.error("Authentication/Authorization error:", parsed.message);
    return;
  }

  showToast(customMessage ?? parsed.message, "error");
}

export function isAuthError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}
