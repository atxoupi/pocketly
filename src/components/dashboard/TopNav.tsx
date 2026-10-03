"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LINKS } from "./navLinks";

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center justify-between border-b border-surface-muted bg-surface px-4 py-3 md:flex">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-accent">POCKETLY</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "text-sm text-accent" : "text-sm text-text-secondary"}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-text-secondary">
        Cerrar sesión
      </button>
    </nav>
  );
}
