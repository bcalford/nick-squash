"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * iOS large-title pattern: a 34px bold title that collapses into a compact
 * centered nav bar once the page scrolls past it.
 */
export function LargeTitleHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 34);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-30 border-b-[0.5px] backdrop-blur-xl transition-all duration-200 pt-safe ${
          collapsed ? "border-separator" : "border-transparent"
        }`}
        style={{ background: collapsed ? "var(--tabbar-bg)" : "transparent" }}
      >
        <div className="mx-auto flex h-11 max-w-lg items-center justify-between px-4">
          <span
            className={`nav-title transition-opacity duration-200 ${
              collapsed ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </span>
          <div className="flex items-center gap-2">{trailing}</div>
        </div>
      </div>
      <header className="mx-auto max-w-lg px-4 pb-2 pt-safe">
        <div className="h-11" />
        <h1 className="large-title">{title}</h1>
      </header>
    </>
  );
}
