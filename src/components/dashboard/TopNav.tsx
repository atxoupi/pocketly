"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/accounts", label: "Cuentas" },
  { href: "/dashboard/transactions", label: "Transacciones" },
  { href: "/dashboard/loans", label: "Préstamos" },
  { href: "/dashboard/settings", label: "Ajustes" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-between border-b border-surface-muted bg-surface px-4 py-3">
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
