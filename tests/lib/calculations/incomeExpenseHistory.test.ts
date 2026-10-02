import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getIncomeExpenseHistory } from "@/lib/calculations/incomeExpenseHistory";

describe("getIncomeExpenseHistory", () => {
  it("devuelve ingresos y gastos totales de cada uno de los últimos meses", async () => {
    const user = await prisma.user.create({ data: { email: "incexp@example.com", passwordHash: "x" } });
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
    const history = await getIncomeExpenseHistory(user.id, 2, now);

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ month: "2026-09", incomeCents: 150000, expenseCents: 90000 });
    expect(history[1]).toMatchObject({ month: "2026-10", incomeCents: 0, expenseCents: 0 });
  });
});
