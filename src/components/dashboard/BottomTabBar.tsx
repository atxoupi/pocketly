"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS } from "./navLinks";

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-surface-muted bg-surface md:hidden">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "flex-1 py-2 text-center text-xs text-accent"
              : "flex-1 py-2 text-center text-xs text-text-secondary"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
