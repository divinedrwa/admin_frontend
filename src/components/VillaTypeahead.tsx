"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useVilla, useVillaSearch } from "@/hooks/useVillas";
import { VillaOption } from "@/types/villa";
import { formatVillaLabel } from "@/utils/villaLabel";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 20;

type BaseProps = {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
  "aria-label"?: string;
};

type SingleProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (villaId: string, villa?: VillaOption) => void;
};

type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (villaIds: string[], villas: VillaOption[]) => void;
};

export type VillaTypeaheadProps = SingleProps | MultiProps;

function toVillaOption(v: {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
  units?: VillaOption["units"];
}): VillaOption {
  return {
    id: v.id,
    villaNumber: v.villaNumber,
    block: v.block,
    ownerName: v.ownerName,
    units: v.units,
  };
}

export function VillaTypeahead(props: VillaTypeaheadProps) {
  if (props.multiple) {
    return <VillaMultiTypeahead {...props} />;
  }
  return <VillaSingleTypeahead {...props} />;
}

function VillaSingleTypeahead({
  value,
  onChange,
  placeholder = "Search villa number or block…",
  disabled = false,
  className = "",
  required = false,
  id: idProp,
  "aria-label": ariaLabel,
}: SingleProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const { data: selectedVillaData } = useVilla(value || undefined);
  const selectedVilla = selectedVillaData?.villa
    ? toVillaOption(selectedVillaData.villa)
    : undefined;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useVillaSearch(debouncedQuery, { enabled: open });
  const options = (data?.villas ?? []) as VillaOption[];

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

  const displayValue =
    open || query.length > 0
      ? query
      : selectedVilla
        ? formatVillaLabel(selectedVilla)
        : "";

  const pick = (villa: VillaOption) => {
    onChange(villa.id, villa);
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("", undefined);
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel ?? "Search villas"}
          required={required && !value}
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          className="input w-full pr-8"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("", undefined);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
              setOpen(true);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, Math.max(0, options.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && open && options[highlight]) {
              e.preventDefault();
              pick(toVillaOption(options[highlight]));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {value && !disabled ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-elevated text-fg-secondary"
            aria-label="Clear villa selection"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-surface-border bg-surface shadow-lg"
        >
          {isFetching && options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-fg-secondary">Searching…</li>
          ) : null}
          {!isFetching && options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-fg-secondary">No villas found</li>
          ) : null}
          {options.map((villa, i) => (
            <li key={villa.id} role="option" aria-selected={value === villa.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-elevated ${
                  i === highlight ? "bg-surface-elevated" : ""
                } ${value === villa.id ? "font-medium text-brand-primary" : "text-fg-primary"}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(toVillaOption(villa))}
              >
                {formatVillaLabel(villa)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function VillaMultiTypeahead({
  value,
  onChange,
  placeholder = "Search to add villas…",
  disabled = false,
  className = "",
  id: idProp,
  "aria-label": ariaLabel,
}: MultiProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Record<string, VillaOption>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useVillaSearch(debouncedQuery, { enabled: open });
  const options = ((data?.villas ?? []) as VillaOption[]).filter((v) => !value.includes(v.id));

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const add = (villa: VillaOption) => {
    const nextIds = [...value, villa.id];
    const nextMap = { ...selectedMap, [villa.id]: villa };
    setSelectedMap(nextMap);
    onChange(nextIds, nextIds.map((id) => nextMap[id]).filter(Boolean));
    setQuery("");
    setDebouncedQuery("");
  };

  const remove = (villaId: string) => {
    const nextIds = value.filter((id) => id !== villaId);
    const nextMap = { ...selectedMap };
    delete nextMap[villaId];
    setSelectedMap(nextMap);
    onChange(nextIds, nextIds.map((id) => nextMap[id]).filter(Boolean));
  };

  const selectedChips = value.map((id) => {
    const v = selectedMap[id];
    return v ? (
      <span
        key={id}
        className="inline-flex items-center gap-1 rounded-full bg-brand-primary-light px-2.5 py-0.5 text-xs font-medium text-brand-primary"
      >
        {formatVillaLabel(v)}
        {!disabled ? (
          <button
            type="button"
            onClick={() => remove(id)}
            className="rounded hover:bg-brand-primary/10 p-0.5"
            aria-label={`Remove ${formatVillaLabel(v)}`}
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </span>
    ) : (
      <span key={id} className="badge badge-gray text-xs">
        Villa…
      </span>
    );
  });

  return (
    <div ref={containerRef} className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel ?? "Search villas to add"}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          className="input w-full"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && open && options[0]) {
              e.preventDefault();
              add(toVillaOption(options[0]));
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && !disabled ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-surface-border bg-surface shadow-lg"
          >
            {isFetching && options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-fg-secondary">Searching…</li>
            ) : null}
            {!isFetching && options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-fg-secondary">
                {debouncedQuery ? "No matching villas" : "Type to search villas"}
              </li>
            ) : null}
            {options.map((villa) => (
              <li key={villa.id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-fg-primary hover:bg-surface-elevated"
                  onClick={() => add(toVillaOption(villa))}
                >
                  {formatVillaLabel(villa)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">{selectedChips}</div>
      ) : (
        <p className="text-xs text-fg-secondary">No villas selected</p>
      )}
      <p className="text-xs text-fg-secondary">Selected: {value.length} villa(s)</p>
    </div>
  );
}
