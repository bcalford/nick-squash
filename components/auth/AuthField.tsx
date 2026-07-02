"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export const AuthField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function AuthField({ label, error, className = "", id, ...props }, ref) {
  const fieldId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className={`h-[50px] rounded-[14px] border bg-elevated px-4 text-[17px] outline-none transition-colors placeholder:text-ink-3 focus:border-cobalt ${
          error ? "border-coral" : "border-separator"
        } ${className}`}
        {...props}
      />
      {error ? <p className="text-[13px] font-medium text-coral">{error}</p> : null}
    </div>
  );
});
