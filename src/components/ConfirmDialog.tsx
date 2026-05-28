"use client";

import { useCallback, useState } from "react";
import { Modal } from "./Modal";
import { TriangleAlert } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows a red confirm button; "primary" shows the default blue. */
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const btnClass =
    variant === "danger" ? "btn btn-danger" : "btn btn-primary";

  return (
    <Modal open={open} onClose={onCancel} ariaLabel={title} maxWidth="max-w-sm">
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <div className="mt-0.5 shrink-0 rounded-full bg-brand-danger/10 p-2">
              <TriangleAlert className="h-5 w-5 text-brand-danger" />
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-fg-primary">{title}</h3>
            <p className="text-sm text-fg-secondary">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${btnClass} text-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook – drop-in replacement for window.confirm()                           */
/* -------------------------------------------------------------------------- */

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
};

/**
 * Imperative confirmation hook.
 *
 * ```tsx
 * const { confirm, ConfirmUI } = useConfirm();
 *
 * async function handleDelete() {
 *   if (!(await confirm({ title: "Delete?", message: "Cannot be undone." }))) return;
 *   // proceed…
 * }
 *
 * return <>{/* page content *\/}{ConfirmUI}</>
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const ConfirmUI = state ? (
    <ConfirmDialog
      open
      title={state.opts.title}
      message={state.opts.message}
      confirmLabel={state.opts.confirmLabel}
      cancelLabel={state.opts.cancelLabel}
      variant={state.opts.variant ?? "danger"}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmUI } as const;
}
