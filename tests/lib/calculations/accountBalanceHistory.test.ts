import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceHistory } from "@/lib/calculations/accountBalanceHistory";

describe("getAccountBalanceHistory", () => {
  it("devuelve un punto por mes con el saldo de cada cuenta hasta ese mes", async () => {
    const user = await prisma.user.create({ data: { email: "hist@example.com", passwordHash: "x" } });
    const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 10000, date: new Date("2026-08-15"), type: "income" },
    });

    const now = new Date("2026-10-15");
    const { accounts, history } = await getAccountBalanceHistory(user.id, 3, now);

    expect(accounts).toEqual([{ id: account.id, name: "Principal" }]);
    expect(history).toHaveLength(3);
    expect(history[0].month).toBe("2026-08");
    expect(history[0].balances[account.id]).toBe(10000);
    expect(history[1].month).toBe("2026-09");
    expect(history[1].balances[account.id]).toBe(10000);
    expect(history[2].month).toBe("2026-10");
    expect(history[2].balances[account.id]).toBe(10000);
  });
});
