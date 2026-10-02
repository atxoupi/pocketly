import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getUpcomingInstallments } from "@/lib/calculations/upcomingInstallments";

describe("getUpcomingInstallments", () => {
  it("devuelve solo cuotas pendientes dentro de los próximos 7 días", async () => {
    const user = await prisma.user.create({ data: { email: "upcoming@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        name: "Coche",
        principalCents: 100000,
        annualInterestRatePercent: 0,
        startDate: new Date("2026-01-01"),
        termMonths: 3,
        paymentAccountId: account.id,
      },
    });

    const now = new Date("2026-10-01T00:00:00.000Z");
    const inThreeDays = new Date("2026-10-04T00:00:00.000Z");
    const inTenDays = new Date("2026-10-11T00:00:00.000Z");

    await prisma.loanInstallment.create({
      data: { loanId: loan.id, installmentNumber: 1, dueDate: inThreeDays, principalCents: 10000, interestCents: 0, totalCents: 10000, status: "pending" },
    });
    await prisma.loanInstallment.create({
      data: { loanId: loan.id, installmentNumber: 2, dueDate: inTenDays, principalCents: 10000, interestCents: 0, totalCents: 10000, status: "pending" },
    });
    await prisma.loanInstallment.create({
      data: { loanId: loan.id, installmentNumber: 3, dueDate: inThreeDays, principalCents: 10000, interestCents: 0, totalCents: 10000, status: "paid" },
    });

    const upcoming = await getUpcomingInstallments(user.id, 7, now);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].loanName).toBe("Coche");
    expect(upcoming[0].totalCents).toBe(10000);
  });
});
