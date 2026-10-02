import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { calculateRemainderCents, calculateSavingsPercent, getSavingsStatus } from "@/lib/calculations/remainder";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

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

  const incomeCents = incomeSum._sum.amountCents ?? 0;
  const expenseCents = expenseSum._sum.amountCents ?? 0;
  const remainderCents = calculateRemainderCents(incomeCents, expenseCents);
  const savingsPercent = calculateSavingsPercent(remainderCents, incomeCents);
  const status = getSavingsStatus(savingsPercent, user.savingsGoalPercent);

  return NextResponse.json({
    month,
    incomeCents,
    expenseCents,
    remainderCents,
    savingsPercent,
    savingsGoalPercent: user.savingsGoalPercent,
    status,
  });
}
