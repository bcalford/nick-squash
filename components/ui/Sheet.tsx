"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const spring = { type: "spring" as const, damping: 32, stiffness: 380 };

const emptySubscribe = () => () => {};
/** true after hydration on the client, false during SSR — portal-safe */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** full-height sheet (e.g. comments) vs content-height */
  full?: boolean;
}) {
  const mounted = useMounted();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-[--radius-sheet] bg-elevated ${
              full ? "h-[88dvh]" : "max-h-[88dvh]"
            }`}
            style={{ boxShadow: "var(--sheet-shadow)" }}
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={spring}
            drag={reduced ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="flex shrink-0 items-center justify-center pb-1 pt-2.5">
              <div className="h-[5px] w-9 rounded-full bg-inset" />
            </div>
            {title ? (
              <div className="flex shrink-0 items-center justify-center px-4 pb-3 pt-1">
                <h2 className="nav-title">{title}</h2>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto pb-safe">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
