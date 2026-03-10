"use client";

import { useState, useEffect, useRef, useMemo, useCallback, ReactNode } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Set of values that should be shown but not selectable */
  disabledValues?: Set<string>;
  /** Custom render for each option row */
  renderOption?: (option: DropdownOption, state: { selected: boolean; disabled: boolean }) => ReactNode;
  /** Controlled search — if provided, search state is external */
  search?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

export default function Dropdown({
  options, value, onChange, disabled, searchable,
  placeholder, disabledValues, renderOption,
  search: controlledSearch, onSearchChange,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Support both controlled and uncontrolled search
  const isControlledSearch = controlledSearch !== undefined;
  const search = isControlledSearch ? controlledSearch : internalSearch;
  const setSearch = isControlledSearch
    ? (q: string) => onSearchChange?.(q)
    : setInternalSearch;

  const openDropdown = useCallback(() => {
    setOpen(true);
    setVisible(true);
    if (searchable) setTimeout(() => inputRef.current?.focus(), 0);
  }, [searchable]);

  const closeDropdown = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      setSearch("");
    }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlledSearch, onSearchChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closeDropdown]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const displayLabel = selectedLabel ?? placeholder ?? value;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          if (open) closeDropdown();
          else openDropdown();
        }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-200 hover:border-white/[0.15] focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 transition-colors"
      >
        <span className={`truncate ${!selectedLabel && placeholder ? "text-[var(--muted)]" : ""}`}>
          {displayLabel}
        </span>
        <svg
          className={`w-3 h-3 text-zinc-500 ml-1 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-lg shadow-xl shadow-black/50 overflow-hidden backdrop-blur-xl transition-all duration-150 ease-out origin-top ${
            visible
              ? "opacity-100 scale-y-100 translate-y-0"
              : "opacity-0 scale-y-90 -translate-y-1"
          }`}
        >
          {searchable && (
            <div className="p-1.5 border-b border-white/[0.06]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1 text-xs bg-white/[0.04] border border-white/[0.06] rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-[var(--muted)]">No results</p>
            ) : (
              filteredOptions.map((opt) => {
                const isDisabled = disabledValues?.has(opt.value) ?? false;
                const isSelected = opt.value === value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(opt.value);
                      closeDropdown();
                    }}
                    className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                      isDisabled
                        ? "text-zinc-600 cursor-default"
                        : isSelected
                          ? "bg-indigo-500/15 text-indigo-300"
                          : "text-zinc-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    {renderOption
                      ? renderOption(opt, { selected: isSelected, disabled: isDisabled })
                      : opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
