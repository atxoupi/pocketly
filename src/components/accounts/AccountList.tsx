"use client";

import { useState } from "react";
import { formatCurrencyCents } from "@/lib/format";

type Account = { id: string; name: string; type: string; balanceCents: number };

function AccountCard({ account, onChanged }: { account: Account; onChanged: () => void }) {
  const [name, setName] = useState(account.name);

  async function handleRename() {
    if (name === account.name) return;
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onChanged();
  }

  async function handleDelete() {
    if (!window.confirm(`¿Borrar la cuenta "${account.name}"?`)) return;
    const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      window.alert(typeof data.error === "string" ? data.error : "No se pudo borrar la cuenta");
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded border border-surface-muted bg-surface p-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleRename}
        className="mb-1 w-full bg-transparent text-sm text-text-secondary outline-none"
      />
      <p className={`text-xl font-semibold ${account.balanceCents >= 0 ? "text-positive" : "text-negative"}`}>
        {formatCurrencyCents(account.balanceCents)}
      </p>
      <button onClick={handleDelete} className="mt-2 text-sm text-negative">
        Borrar cuenta
      </button>
    </div>
  );
}

export function AccountList({ accounts, onChanged }: { accounts: Account[]; onChanged: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} onChanged={onChanged} />
      ))}
    </div>
  );
}
