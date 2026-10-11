"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Board of Directors", href: "/board" },
  { label: "My Profile", href: "/board/profile" },
  { label: "Software Team", href: "/decision-engine" },
  { label: "Business Case", href: "/business-case" },
] as const;

export function EngineNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg bg-board-bg p-1" aria-label="App navigation">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-board-surface shadow-sm text-board-text"
                : "text-board-text-tertiary hover:text-board-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
