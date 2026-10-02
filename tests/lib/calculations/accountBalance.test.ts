import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

async function setupUserWithAccounts() {
  const user = await prisma.user.create({ data: { email: "bal@example.com", passwordHash: "x" } });
  const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
  const main = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 10000 },
  });
  const savings = await prisma.account.create({
    data: { userId: user.id, name: "Ahorro", type: "savings", initialBalanceCents: 0 },
  });
  return { user, category, main, savings };
}

describe("getAccountBalanceCents", () => {
  it("parte del saldo inicial si no hay movimientos", async () => {
    const { main } = await setupUserWithAccounts();
    expect(await getAccountBalanceCents(main.id)).toBe(10000);
  });

  it("suma ingresos y resta gastos de esa cuenta", async () => {
    const { user, category, main } = await setupUserWithAccounts();
    await prisma.transaction.create({
      data: { userId: user.id, accountId: main.id, categoryId: category.id, amountCents: 5000, date: new Date(), type: "income" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: main.id, categoryId: category.id, amountCents: 2000, date: new Date(), type: "expense" },
    });
    expect(await getAccountBalanceCents(main.id)).toBe(10000 + 5000 - 2000);
  });

  it("aplica transferencias entrantes y salientes", async () => {
    const { user, main, savings } = await setupUserWithAccounts();
    await prisma.transfer.create({
      data: { userId: user.id, fromAccountId: main.id, toAccountId: savings.id, amountCents: 3000, date: new Date() },
    });
    expect(await getAccountBalanceCents(main.id)).toBe(10000 - 3000);
    expect(await getAccountBalanceCents(savings.id)).toBe(0 + 3000);
  });
});
