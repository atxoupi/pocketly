import { prisma } from "@/lib/prisma";

export async function getAccountBalanceCents(accountId: string, asOf: Date = new Date()): Promise<number> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const [incomeSum, expenseSum, transfersIn, transfersOut] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId, type: "income", date: { lte: asOf } }, _sum: { amountCents: true } }),
    prisma.transaction.aggregate({ where: { accountId, type: "expense", date: { lte: asOf } }, _sum: { amountCents: true } }),
    prisma.transfer.aggregate({ where: { toAccountId: accountId, date: { lte: asOf } }, _sum: { amountCents: true } }),
    prisma.transfer.aggregate({ where: { fromAccountId: accountId, date: { lte: asOf } }, _sum: { amountCents: true } }),
  ]);
  return (
    account.initialBalanceCents +
    (incomeSum._sum.amountCents ?? 0) -
    (expenseSum._sum.amountCents ?? 0) +
    (transfersIn._sum.amountCents ?? 0) -
    (transfersOut._sum.amountCents ?? 0)
  );
}
