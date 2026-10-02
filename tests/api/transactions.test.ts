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
});
