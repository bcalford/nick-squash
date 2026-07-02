"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div
      role="tablist"
      className={`flex rounded-[--radius-control] bg-inset p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              selected ? "text-ink" : "text-ink-2"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[10px] bg-elevated shadow-sm"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
