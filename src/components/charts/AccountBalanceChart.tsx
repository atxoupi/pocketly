"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, getCategoricalColor } from "@/lib/chartColors";

type ChartData = {
  accounts: { id: string; name: string }[];
  history: { month: string; balances: Record<string, number> }[];
};

export function AccountBalanceChart() {
  const [data, setData] = useState<ChartData | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/charts/account-balances?months=12")
      .then((res) => res.json())
      .then((result) => {
        if (!ignore) setData(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (!data || data.accounts.length === 0) return null;

  const rows = data.history.map((point) => ({
    month: point.month,
    ...Object.fromEntries(data.accounts.map((a) => [a.id, (point.balances[a.id] ?? 0) / 100])),
  }));

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Evolución de saldo por cuenta</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows}>
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <YAxis stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          {data.accounts.map((account) => (
            <Line
              key={account.id}
              type="monotone"
              dataKey={account.id}
              name={account.name}
              stroke={getCategoricalColor(account.id)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
