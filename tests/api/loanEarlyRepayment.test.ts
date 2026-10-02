import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { POST as POST_LOAN } from "@/app/api/loans/route";
import { POST as EARLY_REPAYMENT } from "@/app/api/loans/[id]/early-repayment/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

async function setupLoan() {
  const user = await prisma.user.create({ data: { email: "early@example.com", passwordHash: "x" } });
  await prisma.category.create({ data: { userId: user.id, name: "Préstamos", type: "expense", color: "#facc15" } });
  const account = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 2000000 },
  });
  mockUser(user.id);
  const res = await POST_LOAN(
    new Request("http://localhost/api/loans", {
      method: "POST",
      body: JSON.stringify({
        name: "Coche",
        principalCents: 600000,
        annualInterestRatePercent: 12,
        startDate: new Date().toISOString(),
        termMonths: 12,
        paymentAccountId: account.id,
      }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const loan = await res.json();
  return { user, account, loan };
}

function earlyRepaymentRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/loans/[id]/early-repayment", () => {
  it("modo reduce-payment: mismo número de cuotas pendientes, cuota más baja, capital cuadra", async () => {
    const { loan } = await setupLoan();

    const res = await EARLY_REPAYMENT(
      earlyRepaymentRequest({ amountCents: 100000, mode: "reduce-payment" }),
      { params: Promise.resolve({ id: loan.id }) }
    );
    expect(res.status).toBe(200);

    const pending = await prisma.loanInstallment.findMany({ where: { loanId: loan.id, status: "pending" } });
    expect(pending).toHaveLength(12);
    const totalPrincipal = pending.reduce((sum, i) => sum + i.principalCents, 0);
    expect(totalPrincipal).toBe(500000);

    const transaction = await prisma.transaction.findFirst({ where: { note: { contains: "Amortización anticipada" } } });
    expect(transaction?.amountCents).toBe(100000);
    expect(transaction?.type).toBe("expense");
  });

  it("modo reduce-term: menos cuotas pendientes que antes, el préstamo termina antes", async () => {
    const { loan } = await setupLoan();

    const res = await EARLY_REPAYMENT(
      earlyRepaymentRequest({ amountCents: 100000, mode: "reduce-term" }),
      { params: Promise.resolve({ id: loan.id }) }
    );
    expect(res.status).toBe(200);

    const pending = await prisma.loanInstallment.findMany({ where: { loanId: loan.id, status: "pending" } });
    expect(pending.length).toBeLessThan(12);

    const updatedLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(updatedLoan?.termMonths).toBeLessThan(12);
  });

  it("rechaza un importe mayor que el capital pendiente", async () => {
    const { loan } = await setupLoan();

    const res = await EARLY_REPAYMENT(
      earlyRepaymentRequest({ amountCents: 700000, mode: "reduce-payment" }),
      { params: Promise.resolve({ id: loan.id }) }
    );
    expect(res.status).toBe(400);
  });

  it("rechaza amortizar un préstamo de otro usuario", async () => {
    const { loan } = await setupLoan();
    const attacker = await prisma.user.create({ data: { email: "early-attacker@example.com", passwordHash: "x" } });
    mockUser(attacker.id);

    const res = await EARLY_REPAYMENT(
      earlyRepaymentRequest({ amountCents: 1000, mode: "reduce-payment" }),
      { params: Promise.resolve({ id: loan.id }) }
    );
    expect(res.status).toBe(404);
  });
});
