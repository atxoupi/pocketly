import { formatCurrencyCents } from "@/lib/format";

export type Installment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalCents: number;
  interestCents: number;
  totalCents: number;
  status: string;
};

export function InstallmentTable({
  installments,
  onPay,
}: {
  installments: Installment[];
  onPay: (installmentId: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-text-secondary">
          <th className="py-2">#</th>
          <th>Vencimiento</th>
          <th className="text-right">Capital</th>
          <th className="text-right">Interés</th>
          <th className="text-right">Cuota</th>
          <th className="text-right">Estado</th>
        </tr>
      </thead>
      <tbody>
        {installments.map((installment) => (
          <tr key={installment.id} className="border-t border-surface-muted">
            <td className="py-2 text-text-primary">{installment.installmentNumber}</td>
            <td className="text-text-primary">{new Date(installment.dueDate).toLocaleDateString("es-ES")}</td>
            <td className="text-right text-text-primary">{formatCurrencyCents(installment.principalCents)}</td>
            <td className="text-right text-text-primary">{formatCurrencyCents(installment.interestCents)}</td>
            <td className="text-right text-text-primary">{formatCurrencyCents(installment.totalCents)}</td>
            <td className="text-right">
              {installment.status === "paid" ? (
                <span className="text-positive">Pagada</span>
              ) : (
                <button
                  onClick={() => onPay(installment.id)}
                  className="rounded bg-accent px-2 py-1 text-xs font-medium text-background"
                >
                  Marcar pagada
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
