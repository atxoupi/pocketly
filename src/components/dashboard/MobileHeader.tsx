"use client";

import { signOut } from "next-auth/react";

export function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-surface-muted bg-surface px-4 py-3 md:hidden">
      <span className="text-sm font-semibold text-accent">POCKETLY</span>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-text-secondary">
        Cerrar sesión
      </button>
    </header>
  );
}
