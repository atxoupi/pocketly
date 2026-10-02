import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRemainderHistory } from "@/lib/calculations/remainderHistory";

describe("getRemainderHistory", () => {
  it("calcula el remanente de cada uno de los últimos meses", async () => {
    const user = await prisma.user.create({ data: { email: "remhist@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const incomeCategory = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const expenseCategory = await prisma.category.create({ data: { name: "Gasto", type: "expense", color: "#111" } });

    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: incomeCategory.id, amountCents: 150000, date: new Date("2026-09-05"), type: "income" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: expenseCategory.id, amountCents: 90000, date: new Date("2026-09-10"), type: "expense" },
    });

    const now = new Date("2026-10-15");
    const history = await getRemainderHistory(user.id, 2, now);

    expect(history).toHaveLength(2);
    expect(history[0].month).toBe("2026-09");
    expect(history[0].remainderCents).toBe(60000);
    expect(history[1].month).toBe("2026-10");
    expect(history[1].remainderCents).toBe(0);
  });
});
