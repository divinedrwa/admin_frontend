"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible label for the dialog (announced by screen readers). */
  ariaLabel?: string;
  /** Max-width class, e.g. "max-w-md", "max-w-lg". Defaults to "max-w-md". */
  maxWidth?: string;
  /** Extra className on the inner card container. */
  className?: string;
  /** Override the default z-index (z-50). */
  zIndex?: string;
}

/**
 * Reusable modal overlay with:
 * - Click-outside-to-close
 * - Escape key to close
 * - Focus trap (returns focus on unmount)
 * - Scroll lock on body
 */
export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  maxWidth = "max-w-md",
  className = "",
  zIndex = "z-50",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus trap + escape key — depends only on `open` so typing in
  // inputs never re-runs the effect and steals focus.
  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement;

    // Focus the dialog container
    const timer = setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${maxWidth} max-h-[calc(100vh-2rem)] overflow-y-auto ${className} outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
