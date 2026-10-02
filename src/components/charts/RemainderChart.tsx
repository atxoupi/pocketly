"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyCents } from "@/lib/format";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CHART_SINGLE_SERIES_COLOR } from "@/lib/chartColors";

type Point = { month: string; remainderCents: number };

export function RemainderChart() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/charts/remainder-history?months=12")
      .then((res) => res.json())
      .then((result) => {
        if (!ignore) setData(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (data.length === 0) return null;

  const rows = data.map((p) => ({ month: p.month, remainder: p.remainderCents / 100 }));

  return (
    <div className="mb-4 rounded border border-surface-muted bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Evolución del remanente</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <YAxis stroke={CHART_AXIS_COLOR} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART_GRID_COLOR} />
          <Tooltip
            formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100))}
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
          />
          <Line type="monotone" dataKey="remainder" stroke={CHART_SINGLE_SERIES_COLOR} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
