"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, getCategoricalColor } from "@/lib/chartColors";
import { getRemainingPrincipalSeries } from "@/lib/calculations/loanProgress";

type Loan = { id: string; name: string };
type LoanDetail = { id: string; name: string; installments: { installmentNumber: number; principalCents: number }[] };

export function LoanProgressChart() {
  const [loans, setLoans] = useState<LoanDetail[] | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/loans")
      .then((res) => res.json())
      .then(async (list: Loan[]) => {
        const details = await Promise.all(
          list.map((loan) => fetch(`/api/loans/${loan.id}`).then((res) => res.json()))
        );
        if (!ignore) setLoans(details);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (!loans || loans.length === 0) return null;

  const maxInstallments = Math.max(...loans.map((l) => l.installments.length));
  const rows: Record<string, number | string>[] = [];
  for (let i = 0; i < maxInstallments; i++) {
    const row: Record<string, number | string> = { installmentNumber: i + 1 };
    for (const loan of loans) {
      const series = getRemainingPrincipalSeries(loan.installments);
      if (series[i]) {
        row[loan.id] = series[i].remainingPrincipalCents / 100;
      }
    }
    rows.push(row);
  }

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Progreso de amortización</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows}>
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="installmentNumber"
            stroke={CHART_AXIS_COLOR}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
            label={{ value: "Cuota #", position: "insideBottom", fill: CHART_AXIS_COLOR, fontSize: 12, dy: 10 }}
          />
          <YAxis stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          {loans.map((loan) => (
            <Line
              key={loan.id}
              type="monotone"
              dataKey={loan.id}
              name={loan.name}
              stroke={getCategoricalColor(loan.id)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
