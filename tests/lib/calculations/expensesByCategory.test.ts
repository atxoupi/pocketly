import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getExpensesByCategory } from "@/lib/calculations/expensesByCategory";

async function expenseTx(userId: string, accountId: string, categoryId: string, amountCents: number) {
  return prisma.transaction.create({
    data: { userId, accountId, categoryId, amountCents, date: new Date("2026-10-05"), type: "expense" },
  });
}

describe("getExpensesByCategory", () => {
  it("devuelve cada categoría con su gasto total del mes, sin plegar si son pocas", async () => {
    const user = await prisma.user.create({ data: { email: "cat-exp@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const food = await prisma.category.create({ data: { userId: user.id, name: "Alimentación", type: "expense", color: "#111" } });
    const transport = await prisma.category.create({ data: { userId: user.id, name: "Transporte", type: "expense", color: "#222" } });

    await expenseTx(user.id, account.id, food.id, 20000);
    await expenseTx(user.id, account.id, transport.id, 5000);

    const result = await getExpensesByCategory(user.id, "2026-10");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ categoryName: "Alimentación", amountCents: 20000 });
    expect(result[1]).toMatchObject({ categoryName: "Transporte", amountCents: 5000 });
  });

  it("pliega las categorías por debajo del top-7 en 'Otros'", async () => {
    const user = await prisma.user.create({ data: { email: "cat-exp2@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });

    for (let i = 1; i <= 9; i++) {
      const category = await prisma.category.create({ data: { userId: user.id, name: `Categoría ${i}`, type: "expense", color: "#000" } });
      await expenseTx(user.id, account.id, category.id, i * 1000);
    }

    const result = await getExpensesByCategory(user.id, "2026-10");
    expect(result).toHaveLength(8);
    expect(result[7].categoryName).toBe("Otros");
    expect(result[7].amountCents).toBe(3000);
  });
});
