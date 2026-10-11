"use client";

import { useState, useRef, useEffect } from "react";

export interface ExportOption {
  label: string;
  onClick: () => void;
}

interface ExportDropdownProps {
  options: ExportOption[];
  disabled?: boolean;
}

export function ExportDropdown({ options, disabled }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={disabled}
        className="rounded-lg border border-board-border bg-board-surface px-3 py-1.5 text-xs font-medium text-board-text-secondary transition-colors hover:border-board-accent/40 hover:text-board-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Export
        <svg
          className="h-3 w-3 opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[168px] rounded-lg border border-board-border bg-board-surface shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.onClick();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-board-text-secondary hover:bg-board-surface-raised hover:text-board-text transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
