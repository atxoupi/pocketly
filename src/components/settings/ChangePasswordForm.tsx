"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setMessage({ text: "Contraseña actualizada", ok: true });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json();
      setMessage({ text: typeof data.error === "string" ? data.error : "No se pudo cambiar la contraseña", ok: false });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <input
        type="password"
        placeholder="Contraseña actual"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
        Cambiar contraseña
      </button>
      {message && <span className={`text-sm ${message.ok ? "text-positive" : "text-negative"}`}>{message.text}</span>}
    </form>
  );
}
