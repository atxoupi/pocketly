import { prisma } from "@/lib/prisma";

export interface UpcomingInstallment {
  id: string;
  loanName: string;
  dueDate: Date;
  totalCents: number;
}

export async function getUpcomingInstallments(
  userId: string,
  days = 7,
  now: Date = new Date()
): Promise<UpcomingInstallment[]> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);

  const installments = await prisma.loanInstallment.findMany({
    where: {
      status: "pending",
      dueDate: { gte: now, lte: cutoff },
      loan: { userId },
    },
    include: { loan: true },
    orderBy: { dueDate: "asc" },
  });

  return installments.map((installment) => ({
    id: installment.id,
    loanName: installment.loan.name,
    dueDate: installment.dueDate,
    totalCents: installment.totalCents,
  }));
}
