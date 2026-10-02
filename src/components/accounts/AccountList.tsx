import { formatCurrencyCents } from "@/lib/format";

type Account = { id: string; name: string; type: string; balanceCents: number };

export function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {accounts.map((account) => (
        <div key={account.id} className="rounded border border-surface-muted bg-surface p-4">
          <p className="text-sm text-text-secondary">{account.name}</p>
          <p className={`text-xl font-semibold ${account.balanceCents >= 0 ? "text-positive" : "text-negative"}`}>
            {formatCurrencyCents(account.balanceCents)}
          </p>
        </div>
      ))}
    </div>
  );
}
