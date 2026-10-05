import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/transactions/route";
import { DELETE } from "@/app/api/transactions/[id]/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

async function setup() {
  const user = await prisma.user.create({ data: { email: "tx@example.com", passwordHash: "x" } });
  const account = await prisma.account.create({
    data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
  });
  const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
  return { user, account, category };
}

describe("transacciones API", () => {
  it("crea una transacción y aparece en el listado filtrado por cuenta", async () => {
    const { user, account, category } = await setup();
    mockUser(user.id);
    const res = await POST(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: account.id,
          categoryId: category.id,
          amountCents: 150000,
          date: "2026-10-01",
          type: "income",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(201);

    const listRes = await GET(new Request(`http://localhost/api/transactions?accountId=${account.id}`));
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].amountCents).toBe(150000);
  });

  it("rechaza crear una transacción con una cuenta de otro usuario", async () => {
    const { account, category } = await setup();
    const other = await prisma.user.create({ data: { email: "tx-other@example.com", passwordHash: "x" } });
    mockUser(other.id);
    const res = await POST(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: account.id,
          categoryId: category.id,
          amountCents: 1000,
          date: "2026-10-01",
          type: "income",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("borra una transacción propia", async () => {
    const { user, account, category } = await setup();
    const tx = await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 100, date: new Date(), type: "expense" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tx.id }) });
    expect(res.status).toBe(200);
  });

  it("rechaza eliminar una transacción generada por el pago de una cuota de préstamo", async () => {
    const { user, account, category } = await setup();
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        name: "Coche",
        principalCents: 100000,
        annualInterestRatePercent: 10,
        startDate: new Date("2026-10-01"),
        termMonths: 12,
        paymentAccountId: account.id,
      },
    });
    const installment = await prisma.loanInstallment.create({
      data: {
        loanId: loan.id,
        installmentNumber: 1,
        dueDate: new Date("2026-11-01"),
        principalCents: 8000,
        interestCents: 1000,
        totalCents: 9000,
        status: "paid",
      },
    });
    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 9000,
        date: new Date(),
        type: "expense",
        generatedFromLoanInstallmentId: installment.id,
      },
    });
    mockUser(user.id);

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tx.id }) });
    expect(res.status).toBe(409);

    const stillExists = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(stillExists).not.toBeNull();
  });

  it("una transferencia aparece como dos filas (transfer-out en origen, transfer-in en destino)", async () => {
    const { user, account } = await setup();
    const account2 = await prisma.account.create({
      data: { userId: user.id, name: "Ahorros", type: "savings", initialBalanceCents: 0 },
    });
    await prisma.transfer.create({
      data: {
        userId: user.id,
        fromAccountId: account.id,
        toAccountId: account2.id,
        amountCents: 5000,
        date: new Date("2026-10-02"),
      },
    });
    mockUser(user.id);

    const list = await (await GET(new Request("http://localhost/api/transactions"))).json();

    expect(list).toHaveLength(2);
    const out = list.find((row: { type: string }) => row.type === "transfer-out");
    const inn = list.find((row: { type: string }) => row.type === "transfer-in");
    expect(out.accountName).toBe("Principal");
    expect(out.amountCents).toBe(5000);
    expect(inn.accountName).toBe("Ahorros");
    expect(inn.amountCents).toBe(5000);
  });

  it("filtrar por accountId de la cuenta origen incluye solo la fila transfer-out de esa transferencia", async () => {
    const { user, account } = await setup();
    const account2 = await prisma.account.create({
      data: { userId: user.id, name: "Ahorros", type: "savings", initialBalanceCents: 0 },
    });
    await prisma.transfer.create({
      data: {
        userId: user.id,
        fromAccountId: account.id,
        toAccountId: account2.id,
        amountCents: 5000,
        date: new Date("2026-10-02"),
      },
    });
    mockUser(user.id);

    const list = await (await GET(new Request(`http://localhost/api/transactions?accountId=${account.id}`))).json();

    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("transfer-out");
    expect(list[0].accountName).toBe("Principal");
  });

  it("filtrar por categoryId o type excluye las filas de transferencia", async () => {
    const { user, account, category } = await setup();
    const account2 = await prisma.account.create({
      data: { userId: user.id, name: "Ahorros", type: "savings", initialBalanceCents: 0 },
    });
    await prisma.transfer.create({
      data: {
        userId: user.id,
        fromAccountId: account.id,
        toAccountId: account2.id,
        amountCents: 5000,
        date: new Date("2026-10-02"),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 1000,
        date: new Date("2026-10-01"),
        type: "income",
      },
    });
    mockUser(user.id);

    const byCategory = await (await GET(new Request(`http://localhost/api/transactions?categoryId=${category.id}`))).json();
    expect(byCategory).toHaveLength(1);
    expect(byCategory[0].type).toBe("income");

    const byType = await (await GET(new Request("http://localhost/api/transactions?type=income"))).json();
    expect(byType).toHaveLength(1);
    expect(byType[0].type).toBe("income");
  });

  it("el orden combinado de transacciones y transferencias respeta la fecha descendente", async () => {
    const { user, account, category } = await setup();
    const account2 = await prisma.account.create({
      data: { userId: user.id, name: "Ahorros", type: "savings", initialBalanceCents: 0 },
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 1000,
        date: new Date("2026-10-01"),
        type: "income",
      },
    });
    await prisma.transfer.create({
      data: {
        userId: user.id,
        fromAccountId: account.id,
        toAccountId: account2.id,
        amountCents: 5000,
        date: new Date("2026-10-03"),
      },
    });
    mockUser(user.id);

    const list = await (await GET(new Request("http://localhost/api/transactions"))).json();

    expect(list).toHaveLength(3);
    expect(new Date(list[0].date).getTime()).toBeGreaterThan(new Date(list[2].date).getTime());
    expect(["transfer-out", "transfer-in"]).toContain(list[0].type);
    expect(list[2].type).toBe("income");
  });

  it("incluye generatedFromLoanInstallmentId en las filas, null para transferencias", async () => {
    const { user, account, category } = await setup();
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amountCents: 1000,
        date: new Date("2026-10-01"),
        type: "income",
      },
    });
    const account2 = await prisma.account.create({
      data: { userId: user.id, name: "Ahorros", type: "savings", initialBalanceCents: 0 },
    });
    await prisma.transfer.create({
      data: { userId: user.id, fromAccountId: account.id, toAccountId: account2.id, amountCents: 500, date: new Date("2026-10-02") },
    });
    mockUser(user.id);

    const list = await (await GET(new Request("http://localhost/api/transactions"))).json();

    const income = list.find((row: { type: string }) => row.type === "income");
    const transfer = list.find((row: { type: string }) => row.type === "transfer-out");
    expect(income.generatedFromLoanInstallmentId).toBeNull();
    expect(transfer.generatedFromLoanInstallmentId).toBeNull();
  });
});
