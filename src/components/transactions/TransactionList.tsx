import { formatCurrencyCents } from "@/lib/format";

type Transaction = { id: string; amountCents: number; date: string; type: string; note: string | null };

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary">
          <th className="py-2">Fecha</th>
          <th>Nota</th>
          <th className="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} className="border-t border-surface-muted">
            <td className="py-2 text-text-primary">{new Date(t.date).toLocaleDateString("es-ES")}</td>
            <td className="text-text-primary">{t.note ?? "-"}</td>
            <td className={`text-right ${t.type === "income" ? "text-positive" : "text-negative"}`}>
              {t.type === "income" ? "+" : "-"}
              {formatCurrencyCents(t.amountCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
