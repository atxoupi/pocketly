import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/loans/route";
import { GET as GET_ONE } from "@/app/api/loans/[id]/route";

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
});
