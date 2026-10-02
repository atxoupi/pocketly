"use client";

import { useState } from "react";

export function AccountForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [initialBalance, setInitialBalance] = useState("0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        initialBalanceCents: Math.round(parseFloat(initialBalance) * 100),
      }),
    });
    setName("");
    setInitialBalance("0");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 rounded border border-surface-muted bg-surface p-3">
      <input
        placeholder="Nombre (ej. Principal)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
        required
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      >
        <option value="checking">Corriente</option>
        <option value="savings">Ahorro</option>
        <option value="cash">Efectivo</option>
      </select>
      <input
        type="number"
        step="0.01"
        placeholder="Saldo inicial"
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
        className="w-32 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
        Añadir cuenta
      </button>
    </form>
  );
}
