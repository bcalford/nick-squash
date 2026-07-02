import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function GroupedList({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card hairline overflow-hidden ${className}`} {...props} />;
}

export function GroupedRow({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex min-h-[--touch] items-center gap-3 px-4 py-3 ${className}`}
      {...props}
    />
  );
}

export function SectionHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`px-4 pb-2 pt-6 text-[13px] font-semibold uppercase tracking-wide text-ink-3 ${className}`}
      {...props}
    />
  );
}
