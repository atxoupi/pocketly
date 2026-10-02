import Link from "next/link";
import { formatCurrencyCents } from "@/lib/format";

type Loan = { id: string; name: string; principalCents: number; annualInterestRatePercent: number; termMonths: number };

export function LoanList({ loans }: { loans: Loan[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {loans.map((loan) => (
        <Link
          key={loan.id}
          href={`/dashboard/loans/${loan.id}`}
          className="rounded border border-surface-muted bg-surface p-4 hover:border-accent"
        >
          <p className="text-sm text-text-secondary">{loan.name}</p>
          <p className="text-xl font-semibold text-text-primary">{formatCurrencyCents(loan.principalCents)}</p>
          <p className="text-xs text-text-secondary">
            {loan.annualInterestRatePercent}% TIN · {loan.termMonths} meses
          </p>
        </Link>
      ))}
    </div>
  );
}
