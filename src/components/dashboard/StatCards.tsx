"use client";

import { useEffect, useState } from "react";
import { formatCurrencyCents } from "@/lib/format";

type Summary = {
  remainderCents: number;
  savingsPercent: number | null;
  savingsGoalPercent: number;
  status: "met" | "exceeded" | "not-met";
};

type Account = { id: string; balanceCents: number };

export function StatCards() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/summary").then((res) => res.json()),
      fetch("/api/accounts").then((res) => res.json()),
    ]).then(([summaryData, accountsData]) => {
      if (!ignore) {
        setSummary(summaryData);
        setAccounts(accountsData);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  if (!summary) return null;

  const totalBalanceCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const statusColor =
    summary.status === "not-met" ? "text-negative" : "text-positive";
  const statusLabel =
    summary.status === "exceeded" ? "Superado" : summary.status === "met" ? "Cumplido" : "No alcanzado";

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded border border-surface-muted bg-surface p-4">
        <p className="text-sm text-text-secondary">Remanente este mes</p>
        <p className={`text-xl font-semibold ${summary.remainderCents >= 0 ? "text-positive" : "text-negative"}`}>
          {formatCurrencyCents(summary.remainderCents)}
        </p>
      </div>
      <div className="rounded border border-surface-muted bg-surface p-4">
        <p className="text-sm text-text-secondary">% ahorro vs objetivo ({summary.savingsGoalPercent}%)</p>
        <p className={`text-xl font-semibold ${statusColor}`}>
          {summary.savingsPercent === null ? "-" : `${summary.savingsPercent.toFixed(1)}%`} · {statusLabel}
        </p>
      </div>
      <div className="rounded border border-surface-muted bg-surface p-4">
        <p className="text-sm text-text-secondary">Saldo total</p>
        <p className="text-xl font-semibold text-text-primary">{formatCurrencyCents(totalBalanceCents)}</p>
      </div>
    </div>
  );
}
