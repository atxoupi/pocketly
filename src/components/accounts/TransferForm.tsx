"use client";

import { useState } from "react";

type Account = { id: string; name: string };

export function TransferForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amountCents: Math.round(parseFloat(amount) * 100),
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    if (!res.ok) {
      setError("No se pudo realizar la transferencia");
      return;
    }
    setAmount("");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Desde...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Hacia...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <input type="number" step="0.01" placeholder="Importe" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">Transferir</button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
