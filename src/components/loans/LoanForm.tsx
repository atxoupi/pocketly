"use client";

import { useEffect, useState } from "react";

type Account = { id: string; name: string };

export function LoanForm({ onCreated }: { onCreated: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [termMonths, setTermMonths] = useState("12");
  const [paymentAccountId, setPaymentAccountId] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then(setAccounts);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        principalCents: Math.round(parseFloat(principal) * 100),
        annualInterestRatePercent: parseFloat(rate),
        startDate,
        termMonths: parseInt(termMonths, 10),
        paymentAccountId,
      }),
    });
    setName("");
    setPrincipal("");
    setRate("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <input placeholder="Nombre (ej. Coche)" value={name} onChange={(e) => setName(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="number" step="0.01" placeholder="Principal" value={principal} onChange={(e) => setPrincipal(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="number" step="0.01" placeholder="Interés anual %" value={rate} onChange={(e) => setRate(e.target.value)} required className="w-32 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="number" placeholder="Plazo (meses)" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Cuenta de pago...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">Crear préstamo</button>
    </form>
  );
}
