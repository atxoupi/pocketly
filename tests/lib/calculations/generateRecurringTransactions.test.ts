import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateDueRecurringTransactions } from "@/lib/calculations/generateRecurringTransactions";

describe("generateDueRecurringTransactions", () => {
  it("genera las instancias mensuales que faltan y no duplica al repetir", async () => {
    const user = await prisma.user.create({ data: { email: "rec@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 150000,
        date: new Date("2026-08-01"),
        type: "income",
        isRecurring: true,
        recurrenceRule: "monthly",
      },
    });

    const created = await generateDueRecurringTransactions(user.id, new Date("2026-10-15"));
    expect(created).toBe(2);

    const all = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(all).toHaveLength(3);

    const createdAgain = await generateDueRecurringTransactions(user.id, new Date("2026-10-15"));
    expect(createdAgain).toBe(0);
  });
});
