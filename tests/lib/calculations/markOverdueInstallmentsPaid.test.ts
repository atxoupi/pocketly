import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { markOverdueInstallmentsAsPaid } from "@/lib/calculations/markOverdueInstallmentsPaid";

describe("markOverdueInstallmentsAsPaid", () => {
  it("marca como pagadas solo las cuotas pendientes con vencimiento en el pasado", async () => {
    const user = await prisma.user.create({ data: { email: "overdue@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        name: "Préstamo",
        principalCents: 300000,
        annualInterestRatePercent: 0,
        startDate: new Date("2026-01-01"),
        termMonths: 3,
        paymentAccountId: account.id,
      },
    });
    const now = new Date("2026-10-01");
    await prisma.loanInstallment.create({
      data: { loanId: loan.id, installmentNumber: 1, dueDate: new Date("2026-02-01"), principalCents: 1000, interestCents: 0, totalCents: 1000, status: "pending" },
    });
    await prisma.loanInstallment.create({
      data: { loanId: loan.id, installmentNumber: 2, dueDate: new Date("2026-12-01"), principalCents: 1000, interestCents: 0, totalCents: 1000, status: "pending" },
    });

    const updatedCount = await markOverdueInstallmentsAsPaid(loan.id, now);
    expect(updatedCount).toBe(1);

    const installments = await prisma.loanInstallment.findMany({ where: { loanId: loan.id }, orderBy: { installmentNumber: "asc" } });
    expect(installments[0].status).toBe("paid");
    expect(installments[1].status).toBe("pending");

    const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
    expect(transactionCount).toBe(0);
  });
});
