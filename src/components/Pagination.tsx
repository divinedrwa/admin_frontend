"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  if (total <= limit) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    onPageChange((clamped - 1) * limit);
  };

  // Show up to 5 page buttons around the current page
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-fg-secondary">
        Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages[0] > 1 && (
          <>
            <button type="button" onClick={() => goTo(1)} className="px-2.5 py-1 text-sm rounded hover:bg-surface-elevated">
              1
            </button>
            {pages[0] > 2 && <span className="px-1 text-fg-secondary">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            className={`px-2.5 py-1 text-sm rounded ${
              p === currentPage
                ? "bg-brand-primary text-white font-medium"
                : "hover:bg-surface-elevated"
            }`}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-fg-secondary">…</span>}
            <button type="button" onClick={() => goTo(totalPages)} className="px-2.5 py-1 text-sm rounded hover:bg-surface-elevated">
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
