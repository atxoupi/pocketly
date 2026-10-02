import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transactionSchema } from "@/lib/validations/transaction";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: { userId, accountId, categoryId, type },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
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
