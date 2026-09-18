"use client";

import { useEffect, useRef } from "react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  bg: string;
  text: string;
  dot: string;
  optionBg: string;
  optionText: string;
}

export function EstadoBadge({
  config,
  compact = false,
}: {
  config: Pick<DropdownOption, "label" | "bg" | "text" | "dot">;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      } ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function EstadoDropdown<T extends string>({
  value,
  options,
  onSelect,
  onClose,
}: {
  value: T;
  options: readonly DropdownOption<T>[];
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 z-50 w-full">
      <ul className="w-fit min-w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
        {options.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => onSelect(option.value)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${option.optionBg} ${option.optionText} ${value === option.value ? "ring-2 ring-inset ring-current opacity-90" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${option.dot}`} />
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
      <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2z" />
    </svg>
  );
}

export function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
      <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

export const actionIconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 transition-colors cursor-pointer sm:h-9 sm:w-9 md:h-10 md:w-10";
