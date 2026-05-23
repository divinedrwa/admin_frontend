import { useCallback, useState } from "react";

/**
 * Reusable hook for checkbox-based row selection.
 *
 * Usage:
 * ```tsx
 * const { selected, toggle, toggleAll, clear, count } = useSelection();
 * ```
 */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    toggle,
    toggleAll,
    clear,
    count: selected.size,
    has: (id: string) => selected.has(id),
    allSelected: (ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)),
  };
}
