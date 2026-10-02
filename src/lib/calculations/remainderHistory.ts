import { prisma } from "@/lib/prisma";
import { calculateRemainderCents } from "./remainder";

export interface MonthlyRemainder {
  month: string;
  remainderCents: number;
}

export async function getRemainderHistory(
  userId: string,
  months = 12,
  now: Date = new Date()
): Promise<MonthlyRemainder[]> {
  const history: MonthlyRemainder[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth() - i;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));
    const monthKey = start.toISOString().slice(0, 7);

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "income", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "expense", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
    ]);

    const remainderCents = calculateRemainderCents(incomeSum._sum.amountCents ?? 0, expenseSum._sum.amountCents ?? 0);
    history.push({ month: monthKey, remainderCents });
  }

  return history;
}
