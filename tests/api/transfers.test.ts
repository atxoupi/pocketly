import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { POST } from "@/app/api/transfers/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("POST /api/transfers", () => {
  it("mueve saldo de una cuenta a otra sin generar transacciones", async () => {
    const user = await prisma.user.create({ data: { email: "transfer@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 100000 },
    });
    const savings = await prisma.account.create({
      data: { userId: user.id, name: "Ahorro", type: "savings", initialBalanceCents: 0 },
    });
    mockUser(user.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: savings.id, amountCents: 20000, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(201);

    expect(await getAccountBalanceCents(main.id)).toBe(80000);
    expect(await getAccountBalanceCents(savings.id)).toBe(20000);

    const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
    expect(transactionCount).toBe(0);
  });

  it("rechaza transferir entre la misma cuenta", async () => {
    const user = await prisma.user.create({ data: { email: "transfer2@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 1000 },
    });
    mockUser(user.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: main.id, amountCents: 100, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rechaza transferir desde una cuenta de otro usuario", async () => {
    const owner = await prisma.user.create({ data: { email: "owner2@example.com", passwordHash: "x" } });
    const attacker = await prisma.user.create({ data: { email: "attacker@example.com", passwordHash: "x" } });
    const main = await prisma.account.create({
      data: { userId: owner.id, name: "Principal", type: "checking", initialBalanceCents: 1000 },
    });
    const target = await prisma.account.create({
      data: { userId: attacker.id, name: "Destino", type: "checking", initialBalanceCents: 0 },
    });
    mockUser(attacker.id);

    const res = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: main.id, toAccountId: target.id, amountCents: 100, date: "2026-10-01" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(403);
  });
});
