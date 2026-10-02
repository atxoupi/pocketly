import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { accountSchema } from "@/lib/validations/account";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = accountSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const account = await prisma.account.update({ where: { id }, data: parsed.data });
  return NextResponse.json(account);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const [transactionCount, transferCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id } }),
    prisma.transfer.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
  ]);
  if (transactionCount > 0 || transferCount > 0) {
    return NextResponse.json({ error: "La cuenta tiene movimientos, no se puede borrar" }, { status: 409 });
  }
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
