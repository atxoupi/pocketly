"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; type: string; color: string };

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const [name, setName] = useState(category.name);

  async function handleRename() {
    if (name === category.name) return;
    await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onChanged();
  }

  async function handleDelete() {
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      window.alert(typeof data.error === "string" ? data.error : "No se pudo borrar la categoría");
      return;
    }
    onChanged();
  }

  return (
    <li className="flex items-center gap-2 rounded border border-surface-muted bg-surface px-3 py-2">
      <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleRename}
        className="flex-1 rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
      />
      <span className="text-xs text-text-secondary">{category.type === "income" ? "ingreso" : "gasto"}</span>
      <button onClick={handleDelete} className="text-sm text-negative">
        Borrar
      </button>
    </li>
  );
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#38bdf8");

  useEffect(() => {
    let ignore = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setCategories(data);
      });
    return () => {
      ignore = true;
    };
  }, [version]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, color }),
    });
    setName("");
    setVersion((v) => v + 1);
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-3 flex flex-wrap items-end gap-2 rounded border border-surface-muted bg-surface p-3">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
          className="rounded bg-background border border-surface-muted px-2 py-1 text-text-primary"
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-12 rounded border border-surface-muted bg-background"
        />
        <button type="submit" className="rounded bg-accent px-3 py-1 font-medium text-background">
          Añadir categoría
        </button>
      </form>
      <ul className="space-y-1">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} onChanged={() => setVersion((v) => v + 1)} />
        ))}
      </ul>
    </div>
  );
}
