import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { POST as POST_LOAN } from "@/app/api/loans/route";
import { POST as PAY } from "@/app/api/loans/[id]/installments/[installmentId]/pay/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

async function setupLoan() {
  const user = await prisma.user.create({ data: { email: "pay@example.com", passwordHash: "x" } });
  await prisma.category.create({ data: { userId: user.id, name: "Préstamos", type: "expense", color: "#facc15" } });
  const account = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 1000000 },
  });
  mockUser(user.id);
  const res = await POST_LOAN(
    new Request("http://localhost/api/loans", {
      method: "POST",
      body: JSON.stringify({
        name: "Coche",
        principalCents: 1000000,
        annualInterestRatePercent: 12,
        startDate: "2026-10-01",
        termMonths: 12,
        paymentAccountId: account.id,
      }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const loan = await res.json();
  const installments = await prisma.loanInstallment.findMany({ where: { loanId: loan.id }, orderBy: { installmentNumber: "asc" } });
  return { user, account, loan, installments };
}

describe("POST /api/loans/[id]/installments/[installmentId]/pay", () => {
  it("marca la cuota como pagada y crea la transacción vinculada en la cuenta de pago", async () => {
    const { user, account, loan, installments } = await setupLoan();
    const first = installments[0];

    const res = await PAY(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: loan.id, installmentId: first.id }) }
    );
    expect(res.status).toBe(200);

    const updated = await prisma.loanInstallment.findUnique({ where: { id: first.id } });
    expect(updated?.status).toBe("paid");

    const transaction = await prisma.transaction.findFirst({ where: { generatedFromLoanInstallmentId: first.id } });
    expect(transaction).not.toBeNull();
    expect(transaction?.amountCents).toBe(first.totalCents);
    expect(transaction?.type).toBe("expense");
    expect(transaction?.accountId).toBe(account.id);
    expect(transaction?.userId).toBe(user.id);

    const category = await prisma.category.findUnique({ where: { id: transaction!.categoryId } });
    expect(category?.name).toBe("Préstamos");
  });

  it("rechaza pagar una cuota ya pagada", async () => {
    const { loan, installments } = await setupLoan();
    const first = installments[0];
    await PAY(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id, installmentId: first.id }) });

    const res = await PAY(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id, installmentId: first.id }) });
    expect(res.status).toBe(409);
  });

  it("rechaza pagar una cuota de un préstamo de otro usuario", async () => {
    const { loan, installments } = await setupLoan();
    const first = installments[0];
    const attacker = await prisma.user.create({ data: { email: "pay-attacker@example.com", passwordHash: "x" } });
    mockUser(attacker.id);

    const res = await PAY(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id, installmentId: first.id }) });
    expect(res.status).toBe(404);
  });
});
