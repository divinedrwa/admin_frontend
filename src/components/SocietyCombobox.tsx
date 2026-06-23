"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { usePublicSocieties, type PublicSociety } from "@/hooks/usePublicSocieties";

const SEARCH_DEBOUNCE_MS = 300;

type SocietyComboboxProps = {
  value: string;
  onChange: (societyId: string, society?: PublicSociety) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
};

export function SocietyCombobox({
  value,
  onChange,
  disabled = false,
  className = "",
  required = false,
  id: idProp,
}: SocietyComboboxProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = usePublicSocieties({
    search: debouncedQuery || undefined,
    limit: 200,
    offset: 0,
  });
  const options = data?.societies ?? [];

  useEffect(() => {
    setHighlight(0);
  }, [debouncedQuery, options.length]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const match = options.find((s) => s.id === value);
    if (match) setSelectedLabel(match.name);
  }, [value, options]);

  const displayValue = open || query.length > 0 ? query : selectedLabel;

  const pick = (society: PublicSociety) => {
    onChange(society.id, society);
    setSelectedLabel(society.name);
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="auth-input-wrap">
        <div className="auth-input-icon">
          <Building2 className="h-5 w-5" />
        </div>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="auth-input auth-input-with-icon pr-10"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search society name or address…"
          disabled={disabled}
          required={required && !value}
          autoComplete="off"
        />
        <ChevronDown className="auth-select-icon h-5 w-5 pointer-events-none" />
      </div>
      {open && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface shadow-lg"
        >
          {isFetching && options.length === 0 ? (
            <li className="px-4 py-3 text-sm text-fg-secondary">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-4 py-3 text-sm text-fg-secondary">No societies found</li>
          ) : (
            options.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={value === s.id}
                className={`cursor-pointer px-4 py-2.5 text-sm ${
                  i === highlight ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-surface-muted"
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
              >
                <div className="font-medium">{s.name}</div>
                {s.address ? (
                  <div className="text-xs text-fg-secondary mt-0.5">{s.address}</div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {data?.total != null && data.total > options.length ? (
        <p className="auth-field-hint mt-1">
          Showing {options.length} of {data.total} — refine search to narrow results
        </p>
      ) : null}
    </div>
  );
}
