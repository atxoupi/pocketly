import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { transferSchema } from "@/lib/validations/transfer";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: parsed.data.fromAccountId } }),
    prisma.account.findUnique({ where: { id: parsed.data.toAccountId } }),
  ]);
  if (!fromAccount || !toAccount || fromAccount.userId !== userId || toAccount.userId !== userId) {
    return NextResponse.json({ error: "Cuenta no válida" }, { status: 403 });
  }

  const transfer = await prisma.transfer.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(transfer, { status: 201 });
}
