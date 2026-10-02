import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET } from "@/app/api/summary/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("GET /api/summary", () => {
  it("calcula remanente y % de ahorro para el mes indicado", async () => {
    const user = await prisma.user.create({
      data: { email: "sum@example.com", passwordHash: "x", savingsGoalPercent: 20 },
    });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const incomeCategory = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const expenseCategory = await prisma.category.create({ data: { name: "Gasto", type: "expense", color: "#111" } });

    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: incomeCategory.id, amountCents: 150000, date: new Date("2026-10-05"), type: "income" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: expenseCategory.id, amountCents: 90000, date: new Date("2026-10-10"), type: "expense" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: expenseCategory.id, amountCents: 999999, date: new Date("2026-05-01"), type: "expense" },
    });

    mockUser(user.id);
    const res = await GET(new Request("http://localhost/api/summary?month=2026-10"));
    const data = await res.json();

    expect(data.remainderCents).toBe(60000);
    expect(data.savingsPercent).toBeCloseTo(40);
    expect(data.savingsGoalPercent).toBe(20);
    expect(data.status).toBe("exceeded");
  });
});
