import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/accounts/route";
import { DELETE } from "@/app/api/accounts/[id]/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

describe("cuentas API", () => {
  it("POST crea una cuenta y GET la devuelve con su saldo", async () => {
    const user = await prisma.user.create({ data: { email: "acc@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const createRes = await POST(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        body: JSON.stringify({ name: "Ahorro", type: "savings", initialBalanceCents: 50000 }),
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(createRes.status).toBe(201);

    const listRes = await GET();
    const accounts = await listRes.json();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].balanceCents).toBe(50000);
  });

  it("no permite borrar una cuenta con transacciones", async () => {
    const user = await prisma.user.create({ data: { email: "acc2@example.com", passwordHash: "x" } });
    const category = await prisma.category.create({ data: { name: "Nómina", type: "income", color: "#000" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 1000, date: new Date(), type: "income" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: account.id }) });
    expect(res.status).toBe(409);
  });
});
