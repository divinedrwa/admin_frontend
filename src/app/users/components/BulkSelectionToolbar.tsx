"use client";

interface BulkSelectionToolbarProps {
  count: number;
  deleting: boolean;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkSelectionToolbar({ count, deleting, onClear, onDelete }: BulkSelectionToolbarProps) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-denied-bg bg-denied-bg/90 px-4 py-3">
      <span className="text-sm text-fg-primary">
        {count} resident{count === 1 ? "" : "s"} selected
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onClear} disabled={deleting} className="text-sm px-3 py-1.5 rounded border border-surface-border bg-surface hover:bg-surface-background disabled:opacity-50">
          Clear
        </button>
        <button type="button" onClick={onDelete} disabled={deleting} className="btn btn-danger text-sm">
          {deleting ? "Deleting…" : "Delete selected residents"}
        </button>
      </div>
    </div>
  );
}
