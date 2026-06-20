"use client";

import Link from "next/link";
import { useEffect } from "react";
import { captureError } from "@/lib/captureError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, {
      digest: error.digest,
      boundary: "global-error",
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
            <p style={{ marginTop: "0.5rem", color: "#666" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #ccc",
                  color: "#111",
                  textDecoration: "none",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
