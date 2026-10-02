import { prisma } from "@/lib/prisma";

export async function markOverdueInstallmentsAsPaid(loanId: string, now: Date = new Date()): Promise<number> {
  const result = await prisma.loanInstallment.updateMany({
    where: { loanId, status: "pending", dueDate: { lte: now } },
    data: { status: "paid" },
  });
  return result.count;
}
