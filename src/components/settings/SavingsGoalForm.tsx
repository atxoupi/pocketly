"use client";

import { useEffect, useState } from "react";

export function SavingsGoalForm() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setValue(String(data.savingsGoalPercent));
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savingsGoalPercent: parseFloat(value) }),
    });
    setMessage(res.ok ? "Guardado" : "No se pudo guardar");
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-end gap-2 rounded border border-surface-muted bg-surface p-3">
      <div>
        <label className="mb-1 block text-sm text-text-secondary">% de ahorro objetivo</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
        />
      </div>
      <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
        Guardar
      </button>
      {message && <span className="text-sm text-text-secondary">{message}</span>}
    </form>
  );
}
