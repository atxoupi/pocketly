"use client";

import { useState } from "react";

export function EarlyRepaymentForm({ loanId, onDone }: { loanId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"reduce-payment" | "reduce-term">("reduce-payment");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/loans/${loanId}/early-repayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: Math.round(parseFloat(amount) * 100), mode }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "No se pudo amortizar");
      return;
    }
    setAmount("");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <input
        type="number"
        step="0.01"
        placeholder="Importe a amortizar"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="w-40 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as "reduce-payment" | "reduce-term")}
        className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      >
        <option value="reduce-payment">Reducir cuota (mismo plazo)</option>
        <option value="reduce-term">Reducir plazo (misma cuota)</option>
      </select>
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
        Amortizar
      </button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </form>
  );
}
