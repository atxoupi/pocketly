import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { earlyRepaymentSchema } from "@/lib/validations/earlyRepayment";
import { calculateFrenchAmortization, calculateTermForFixedPayment } from "@/lib/calculations/amortization";
import { nextOccurrence } from "@/lib/calculations/recurrence";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.userId !== userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = earlyRepaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pendingInstallments = await prisma.loanInstallment.findMany({
    where: { loanId: id, status: "pending" },
    orderBy: { installmentNumber: "asc" },
  });
  if (pendingInstallments.length === 0) {
    return NextResponse.json({ error: "No hay cuotas pendientes que amortizar" }, { status: 409 });
  }

  const remainingPrincipalCents = pendingInstallments.reduce((sum, i) => sum + i.principalCents, 0);
  if (parsed.data.amountCents > remainingPrincipalCents) {
    return NextResponse.json({ error: "El importe supera el capital pendiente" }, { status: 400 });
  }

  const newPrincipalCents = remainingPrincipalCents - parsed.data.amountCents;
  const lastPaidNumber = pendingInstallments[0].installmentNumber - 1;
  const previousInstallment =
    lastPaidNumber > 0
      ? await prisma.loanInstallment.findFirst({ where: { loanId: id, installmentNumber: lastPaidNumber } })
      : null;
  let dueDateCursor = previousInstallment ? previousInstallment.dueDate : loan.startDate;

  let termCount: number;
  if (newPrincipalCents === 0) {
    termCount = 0;
  } else if (parsed.data.mode === "reduce-payment") {
    termCount = pendingInstallments.length;
  } else {
    const currentFixedPaymentCents = pendingInstallments[0].totalCents;
    try {
      termCount = calculateTermForFixedPayment(newPrincipalCents, loan.annualInterestRatePercent, currentFixedPaymentCents);
    } catch {
      return NextResponse.json(
        { error: "La cuota actual no cubre ni el interés del capital restante" },
        { status: 400 }
      );
    }
  }

  const schedule = termCount > 0 ? calculateFrenchAmortization(newPrincipalCents, loan.annualInterestRatePercent, termCount) : [];
  const newInstallmentsData = schedule.map((installment, idx) => {
    dueDateCursor = nextOccurrence(dueDateCursor, "monthly");
    return {
      loanId: id,
      installmentNumber: lastPaidNumber + idx + 1,
      dueDate: dueDateCursor,
      principalCents: installment.principalCents,
      interestCents: installment.interestCents,
      totalCents: installment.totalCents,
    };
  });

  const loansCategory = await prisma.category.findFirst({
    where: { name: "Préstamos", OR: [{ userId }, { userId: null }] },
  });
  if (!loansCategory) {
    return NextResponse.json({ error: "Falta la categoría predefinida 'Préstamos'" }, { status: 500 });
  }

  await prisma.$transaction([
    prisma.loanInstallment.deleteMany({ where: { loanId: id, status: "pending" } }),
    ...(newInstallmentsData.length > 0 ? [prisma.loanInstallment.createMany({ data: newInstallmentsData })] : []),
    prisma.loan.update({ where: { id }, data: { termMonths: lastPaidNumber + newInstallmentsData.length } }),
    prisma.transaction.create({
      data: {
        userId,
        accountId: loan.paymentAccountId,
        categoryId: loansCategory.id,
        amountCents: parsed.data.amountCents,
        date: new Date(),
        type: "expense",
        note: `Amortización anticipada - ${loan.name}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
