import { prisma } from "@/lib/prisma";
import { getAccountBalanceCents } from "./accountBalance";

export interface MonthlyAccountBalances {
  month: string; // "YYYY-MM"
  balances: Record<string, number>; // accountId -> balanceCents
}

function monthEndUTC(year: number, zeroBasedMonth: number): Date {
  return new Date(Date.UTC(year, zeroBasedMonth + 1, 1) - 1);
}

export async function getAccountBalanceHistory(
  userId: string,
  months = 12,
  now: Date = new Date()
): Promise<{ accounts: { id: string; name: string }[]; history: MonthlyAccountBalances[] }> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const history: MonthlyAccountBalances[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() - i;
    const asOf = monthEndUTC(year, month);
    const monthKey = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);

    const balances: Record<string, number> = {};
    for (const account of accounts) {
      balances[account.id] = await getAccountBalanceCents(account.id, asOf);
    }
    history.push({ month: monthKey, balances });
  }

  return { accounts, history };
}
