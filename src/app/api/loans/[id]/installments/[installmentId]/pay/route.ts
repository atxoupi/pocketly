import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; installmentId: string }> }
) {
  const { id, installmentId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.userId !== userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const installment = await prisma.loanInstallment.findUnique({ where: { id: installmentId } });
  if (!installment || installment.loanId !== id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (installment.status === "paid") {
    return NextResponse.json({ error: "La cuota ya está pagada" }, { status: 409 });
  }

  const loansCategory = await prisma.category.findFirst({
    where: { name: "Préstamos", OR: [{ userId }, { userId: null }] },
  });
  if (!loansCategory) {
    return NextResponse.json({ error: "Falta la categoría predefinida 'Préstamos'" }, { status: 500 });
  }

  const [, transaction] = await prisma.$transaction([
    prisma.loanInstallment.update({ where: { id: installmentId }, data: { status: "paid" } }),
    prisma.transaction.create({
      data: {
        userId,
        accountId: loan.paymentAccountId,
        categoryId: loansCategory.id,
        amountCents: installment.totalCents,
        date: new Date(),
        type: "expense",
        note: `Cuota ${installment.installmentNumber} - ${loan.name}`,
        generatedFromLoanInstallmentId: installmentId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, transactionId: transaction.id });
}
