"use client";

import { useEffect, useState } from "react";
import { formatCurrencyCents } from "@/lib/format";

type Upcoming = { id: string; loanName: string; dueDate: string; totalCents: number };

export function UpcomingDueBanner() {
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/loans/upcoming")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setUpcoming(data);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-accent">Próximos vencimientos</p>
      <ul className="space-y-1 text-sm text-text-primary">
        {upcoming.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>{item.loanName} — {new Date(item.dueDate).toLocaleDateString("es-ES")}</span>
            <span>{formatCurrencyCents(item.totalCents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
