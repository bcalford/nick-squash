"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "volt";
type Size = "lg" | "md" | "sm";

const variantClasses: Record<Variant, string> = {
  primary: "gradient-signature font-semibold active:opacity-90",
  secondary: "bg-cobalt-soft text-cobalt font-semibold active:opacity-80",
  destructive: "bg-coral-soft text-coral font-semibold active:opacity-80",
  ghost: "text-cobalt font-semibold active:opacity-70",
  volt: "bg-volt text-[#1a2400] font-bold active:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  lg: "h-[50px] px-6 text-[17px] rounded-[14px]",
  md: "h-11 px-5 text-[15px] rounded-[12px]",
  sm: "h-9 px-4 text-[13px] rounded-[10px]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", loading, className = "", children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="size-[18px] animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-label="Loading"
        />
      ) : (
        children
      )}
    </button>
  );
});
