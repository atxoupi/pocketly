"use client";

import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_OTHER_COLOR, getCategoricalColor } from "@/lib/chartColors";

type CategoryExpense = { categoryId: string; categoryName: string; amountCents: number };

export function ExpensesByCategoryChart() {
  const [data, setData] = useState<CategoryExpense[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/charts/expenses-by-category")
      .then((res) => res.json())
      .then((result) => {
        if (!ignore) setData(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (data.length === 0) return null;

  const rows = data.map((c) => ({ name: c.categoryName, value: c.amountCents / 100, id: c.categoryId }));

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Gastos por categoría (mes actual)</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={false}>
            {rows.map((row) => (
              <Cell key={row.id} fill={row.id === "other" ? CHART_OTHER_COLOR : getCategoricalColor(row.id)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
