"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_AXIS_COLOR, CHART_EXPENSE_COLOR, CHART_GRID_COLOR, CHART_INCOME_COLOR } from "@/lib/chartColors";

type Point = { month: string; incomeCents: number; expenseCents: number };

export function IncomeVsExpenseChart() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/charts/income-expense-history?months=12")
      .then((res) => res.json())
      .then((result) => {
        if (!ignore) setData(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (data.length === 0) return null;

  const rows = data.map((p) => ({
    month: p.month,
    Ingresos: p.incomeCents / 100,
    Gastos: p.expenseCents / 100,
  }));

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Ingresos vs gastos</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows}>
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <YAxis stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Bar dataKey="Ingresos" fill={CHART_INCOME_COLOR} />
          <Bar dataKey="Gastos" fill={CHART_EXPENSE_COLOR} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
