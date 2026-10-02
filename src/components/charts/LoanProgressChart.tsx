"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, getCategoricalColor } from "@/lib/chartColors";
import { buildMonthlyRemainingPrincipalRows } from "@/lib/calculations/loanProgress";

type Loan = { id: string; name: string };
type LoanDetail = {
  id: string;
  name: string;
  installments: { installmentNumber: number; principalCents: number; dueDate: string }[];
};

function monthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  return date.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}

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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { rows } = buildMonthlyRemainingPrincipalRows(loans, currentMonth);

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Progreso de amortización</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows}>
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            stroke={CHART_AXIS_COLOR}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
            tickFormatter={monthLabel}
          />
          <YAxis stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <Tooltip
            labelFormatter={(label) => monthLabel(String(label))}
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <ReferenceLine
            x={currentMonth}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            label={{
              value: "Hoy",
              position: "insideTop",
              fill: "#38bdf8",
              fontSize: 12,
            }}
          />
          {loans.map((loan) => (
            <Line
              key={loan.id}
              type="monotone"
              dataKey={loan.id}
              name={loan.name}
              stroke={getCategoricalColor(loan.id)}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
