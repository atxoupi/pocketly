import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { installments: { orderBy: { installmentNumber: "asc" } } },
  });
  if (!loan || loan.userId !== userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(loan);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.userId !== userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.loan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
