"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export default function Dropdown({ options, value, onChange, disabled, searchable, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          if (searchable) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-zinc-200 hover:border-white/[0.15] focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 transition-colors"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 ml-1 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--surface-light)] border border-white/[0.08] rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-fade-in backdrop-blur-xl">
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
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                    opt.value === value
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-zinc-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
