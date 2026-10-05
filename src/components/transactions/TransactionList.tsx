"use client";

import { formatCurrencyCents } from "@/lib/format";

type Transaction = {
  id: string;
  accountName: string;
  amountCents: number;
  date: string;
  type: string;
  note: string | null;
  generatedFromLoanInstallmentId: string | null;
};

export function TransactionList({
  transactions,
  onDeleted,
}: {
  transactions: Transaction[];
  onDeleted: () => void;
}) {
  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar esta transacción?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      window.alert(typeof data.error === "string" ? data.error : "No se pudo eliminar la transacción");
      return;
    }
    onDeleted();
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary">
          <th className="py-2">Fecha</th>
          <th>Cuenta</th>
          <th>Nota</th>
          <th className="text-right">Importe</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => {
          const isTransfer = t.type === "transfer-out" || t.type === "transfer-in";
          const isPositive = t.type === "income" || t.type === "transfer-in";
          const amountClass = isTransfer ? "text-text-secondary" : isPositive ? "text-positive" : "text-negative";
          const canDelete = !isTransfer && !t.generatedFromLoanInstallmentId;
          return (
            <tr key={t.id} className="border-t border-surface-muted">
              <td className="py-2 text-text-primary">{new Date(t.date).toLocaleDateString("es-ES")}</td>
              <td className="text-text-primary">{t.accountName}</td>
              <td className="text-text-primary">{t.note ?? "-"}</td>
              <td className={`text-right ${amountClass}`}>
                {isTransfer && <span className="mr-1 text-xs">Transferencia</span>}
                {isPositive ? "+" : "-"}
                {formatCurrencyCents(t.amountCents)}
              </td>
              <td className="text-right">
                {canDelete && (
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-negative hover:underline">
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
