"use client";

import { useEffect, useState } from "react";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };

export function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<"monthly" | "weekly">("monthly");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        categoryId,
        amountCents: Math.round(parseFloat(amount) * 100),
        date,
        type,
        note: note || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? recurrenceRule : undefined,
      }),
    });
    setAmount("");
    setNote("");
    onCreated();
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
      </select>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Cuenta...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
        <option value="">Categoría...</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input type="number" step="0.01" placeholder="Importe" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-28 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary" />
      <label className="flex items-center gap-1 text-sm text-text-secondary">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
        Recurrente
      </label>
      {isRecurring && (
        <select value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value as "monthly" | "weekly")} className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary">
          <option value="monthly">Mensual</option>
          <option value="weekly">Semanal</option>
        </select>
      )}
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">Añadir</button>
    </form>
  );
}
