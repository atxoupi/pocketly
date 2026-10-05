import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transactionSchema } from "@/lib/validations/transaction";

type TransactionRow = {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  amountCents: number;
  date: Date;
  type: string;
  note: string | null;
  generatedFromLoanInstallmentId: string | null;
};

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: { userId, accountId, categoryId, type },
    include: { account: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const transactionRows: TransactionRow[] = transactions.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    accountName: t.account.name,
    categoryId: t.categoryId,
    amountCents: t.amountCents,
    date: t.date,
    type: t.type,
    note: t.note,
    generatedFromLoanInstallmentId: t.generatedFromLoanInstallmentId,
  }));

  let transferRows: TransactionRow[] = [];
  if (!categoryId && !type) {
    const transfers = await prisma.transfer.findMany({
      where: {
        userId,
        ...(accountId ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] } : {}),
      },
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    transferRows = transfers.flatMap((transfer) => {
      const rows: TransactionRow[] = [];
      if (!accountId || transfer.fromAccountId === accountId) {
        rows.push({
          id: `${transfer.id}-out`,
          accountId: transfer.fromAccountId,
          accountName: transfer.fromAccount.name,
          categoryId: null,
          amountCents: transfer.amountCents,
          date: transfer.date,
          type: "transfer-out",
          note: transfer.note ?? `Transferencia a ${transfer.toAccount.name}`,
          generatedFromLoanInstallmentId: null,
        });
      }
      if (!accountId || transfer.toAccountId === accountId) {
        rows.push({
          id: `${transfer.id}-in`,
          accountId: transfer.toAccountId,
          accountName: transfer.toAccount.name,
          categoryId: null,
          amountCents: transfer.amountCents,
          date: transfer.date,
          type: "transfer-in",
          note: transfer.note ?? `Transferencia desde ${transfer.fromAccount.name}`,
          generatedFromLoanInstallmentId: null,
        });
      }
      return rows;
    });
  }

  const combined = [...transactionRows, ...transferRows].sort((a, b) => b.date.getTime() - a.date.getTime());

  return NextResponse.json(combined);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: parsed.data.accountId } });
  if (!account || account.userId !== userId) {
    return NextResponse.json({ error: "Cuenta no válida" }, { status: 403 });
  }

  const transaction = await prisma.transaction.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(transaction, { status: 201 });
}
