"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FeedIcon, PlayTabIcon, PlusIcon, LadderIcon, PersonIcon } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  isActive: (pathname: string) => boolean;
};

const leftTabs: Tab[] = [
  { href: "/", label: "Feed", icon: FeedIcon, isActive: (p) => p === "/" },
  { href: "/play", label: "Play", icon: PlayTabIcon, isActive: (p) => p.startsWith("/play") },
];

const rightTabs: Tab[] = [
  {
    href: "/ladders",
    label: "Ladders",
    icon: LadderIcon,
    isActive: (p) => p.startsWith("/ladders") || p.startsWith("/clubs"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: PersonIcon,
    isActive: (p) => p.startsWith("/profile") || p.startsWith("/u/"),
  },
];

function TabLink({ tab, pathname }: { tab: Tab; pathname: string }) {
  const active = tab.isActive(pathname);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={`flex min-w-[--touch] flex-1 flex-col items-center gap-0.5 py-1.5 ${
        active ? "text-cobalt" : "text-ink-3"
      }`}
    >
      <motion.span
        animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 400 }}
      >
        <Icon size={26} strokeWidth={active ? 2.4 : 2} />
      </motion.span>
      <span className="text-[10px] font-semibold">{tab.label}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const logActive = pathname.startsWith("/log");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-[0.5px] border-separator backdrop-blur-xl pb-safe"
      style={{ background: "var(--tabbar-bg)" }}
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-end px-2">
        {leftTabs.map((t) => (
          <TabLink key={t.href} tab={t} pathname={pathname} />
        ))}
        <Link href="/log" aria-label="Log a match" className="flex flex-1 justify-center">
          <motion.span
            whileTap={{ scale: 0.9 }}
            className={`-mt-5 mb-1 flex size-14 items-center justify-center rounded-full text-white shadow-lg gradient-signature ${
              logActive ? "ring-4 ring-cobalt-soft" : ""
            }`}
          >
            <PlusIcon size={28} strokeWidth={2.6} />
          </motion.span>
        </Link>
        {rightTabs.map((t) => (
          <TabLink key={t.href} tab={t} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
