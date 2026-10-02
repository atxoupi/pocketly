import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/loans/route";
import { GET as GET_ONE, DELETE } from "@/app/api/loans/[id]/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

async function setup() {
  const user = await prisma.user.create({ data: { email: "loan@example.com", passwordHash: "x" } });
  const account = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
  });
  return { user, account };
}

describe("préstamos API", () => {
  it("POST crea un préstamo con su tabla de amortización completa", async () => {
    const { user, account } = await setup();
    mockUser(user.id);
    const res = await POST(
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
    expect(res.status).toBe(201);
    const loan = await res.json();
    const installments = await prisma.loanInstallment.findMany({ where: { loanId: loan.id } });
    expect(installments).toHaveLength(12);
    const totalPrincipal = installments.reduce((sum, i) => sum + i.principalCents, 0);
    expect(totalPrincipal).toBe(1000000);
  });

  it("rechaza crear un préstamo con una cuenta de pago de otro usuario", async () => {
    const { account } = await setup();
    const other = await prisma.user.create({ data: { email: "loan-other@example.com", passwordHash: "x" } });
    mockUser(other.id);
    const res = await POST(
      new Request("http://localhost/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: "Coche",
          principalCents: 100000,
          annualInterestRatePercent: 5,
          startDate: "2026-10-01",
          termMonths: 6,
          paymentAccountId: account.id,
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("GET /api/loans lista solo los préstamos propios", async () => {
    const { user, account } = await setup();
    await prisma.loan.create({
      data: {
        userId: user.id,
        name: "Préstamo propio",
        principalCents: 50000,
        annualInterestRatePercent: 0,
        startDate: new Date("2026-01-01"),
        termMonths: 5,
        paymentAccountId: account.id,
      },
    });
    mockUser(user.id);
    const res = await GET();
    const loans = await res.json();
    expect(loans).toHaveLength(1);
  });

  it("GET /api/loans/[id] devuelve el préstamo con sus cuotas ordenadas", async () => {
    const { user, account } = await setup();
    mockUser(user.id);
    const createRes = await POST(
      new Request("http://localhost/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: "Reforma",
          principalCents: 300000,
          annualInterestRatePercent: 8,
          startDate: "2026-10-01",
          termMonths: 3,
          paymentAccountId: account.id,
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const loan = await createRes.json();
    const detailRes = await GET_ONE(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id }) });
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.installments).toHaveLength(3);
    expect(detail.installments[0].installmentNumber).toBe(1);
  });

  it("al crear un préstamo con fecha de inicio pasada, marca como pagadas las cuotas ya vencidas sin generar transacciones", async () => {
    const { user, account } = await setup();
    mockUser(user.id);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);

    const res = await POST(
      new Request("http://localhost/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: "Préstamo antiguo",
          principalCents: 600000,
          annualInterestRatePercent: 10,
          startDate: startDate.toISOString(),
          termMonths: 12,
          paymentAccountId: account.id,
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const loan = await res.json();

    const installments = await prisma.loanInstallment.findMany({ where: { loanId: loan.id } });
    const paid = installments.filter((i) => i.status === "paid");
    const pending = installments.filter((i) => i.status === "pending");

    expect(paid.length).toBeGreaterThanOrEqual(4);
    expect(pending.length).toBeGreaterThan(0);

    const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
    expect(transactionCount).toBe(0);
  });

  it("borra un préstamo y conserva como gasto suelto la transacción de una cuota ya pagada", async () => {
    const { user, account } = await setup();
    mockUser(user.id);
    await prisma.category.create({ data: { userId: user.id, name: "Préstamos", type: "expense", color: "#facc15" } });

    const createRes = await POST(
      new Request("http://localhost/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: "A borrar",
          principalCents: 120000,
          annualInterestRatePercent: 0,
          startDate: "2026-10-01",
          termMonths: 3,
          paymentAccountId: account.id,
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const loan = await createRes.json();
    const installment = await prisma.loanInstallment.findFirst({ where: { loanId: loan.id } });

    const loansCategory = await prisma.category.findFirst({ where: { userId: user.id, name: "Préstamos" } });
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: loansCategory!.id,
        amountCents: 40000,
        date: new Date(),
        type: "expense",
        generatedFromLoanInstallmentId: installment!.id,
      },
    });

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id }) });
    expect(res.status).toBe(200);

    const loanAfter = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(loanAfter).toBeNull();
    const installmentsAfter = await prisma.loanInstallment.findMany({ where: { loanId: loan.id } });
    expect(installmentsAfter).toHaveLength(0);

    const transactionAfter = await prisma.transaction.findUnique({ where: { id: transaction.id } });
    expect(transactionAfter).not.toBeNull();
    expect(transactionAfter?.generatedFromLoanInstallmentId).toBeNull();
  });

  it("rechaza borrar un préstamo de otro usuario", async () => {
    const { user, account } = await setup();
    mockUser(user.id);
    const createRes = await POST(
      new Request("http://localhost/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: "No tuyo",
          principalCents: 10000,
          annualInterestRatePercent: 0,
          startDate: "2026-10-01",
          termMonths: 2,
          paymentAccountId: account.id,
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const loan = await createRes.json();

    const attacker = await prisma.user.create({ data: { email: "loan-delete-other@example.com", passwordHash: "x" } });
    mockUser(attacker.id);

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: loan.id }) });
    expect(res.status).toBe(404);
  });
});
