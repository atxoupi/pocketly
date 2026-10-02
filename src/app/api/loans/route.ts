import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { loanSchema } from "@/lib/validations/loan";
import { calculateFrenchAmortization } from "@/lib/calculations/amortization";
import { nextOccurrence } from "@/lib/calculations/recurrence";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const loans = await prisma.loan.findMany({ where: { userId }, orderBy: { startDate: "desc" } });
  return NextResponse.json(loans);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = loanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: parsed.data.paymentAccountId } });
  if (!account || account.userId !== userId) {
    return NextResponse.json({ error: "Cuenta de pago no válida" }, { status: 403 });
  }

  const { name, principalCents, annualInterestRatePercent, startDate, termMonths, paymentAccountId } = parsed.data;
  const schedule = calculateFrenchAmortization(principalCents, annualInterestRatePercent, termMonths);

  let dueDate = startDate;
  const installmentsData = schedule.map((installment) => {
    dueDate = nextOccurrence(dueDate, "monthly");
    return {
      installmentNumber: installment.installmentNumber,
      dueDate,
      principalCents: installment.principalCents,
      interestCents: installment.interestCents,
      totalCents: installment.totalCents,
    };
  });

  const loan = await prisma.loan.create({
    data: {
      userId,
      name,
      principalCents,
      annualInterestRatePercent,
      startDate,
      termMonths,
      paymentAccountId,
      installments: { create: installmentsData },
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
