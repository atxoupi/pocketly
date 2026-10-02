import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, POST } from "@/app/api/categories/route";
import { DELETE, PATCH } from "@/app/api/categories/[id]/route";

function mockUser(userId: string | null) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/categories", {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("categorías API", () => {
  it("GET devuelve predefinidas + propias", async () => {
    const user = await prisma.user.create({ data: { email: "cat@example.com", passwordHash: "x" } });
    await prisma.category.create({ data: { name: "Predefinida", type: "expense", color: "#000000" } });
    mockUser(user.id);
    const res = await GET();
    const data = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST crea una categoría propia", async () => {
    const user = await prisma.user.create({ data: { email: "cat2@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const res = await POST(
      makeRequest({ name: "Mascotas", type: "expense", color: "#ff00ff" })
    );
    expect(res.status).toBe(201);
    const created = await prisma.category.findFirst({ where: { name: "Mascotas" } });
    expect(created?.userId).toBe(user.id);
  });

  it("no permite borrar una categoría predefinida", async () => {
    const user = await prisma.user.create({ data: { email: "cat3@example.com", passwordHash: "x" } });
    const predefined = await prisma.category.create({
      data: { name: "Predef2", type: "expense", color: "#000000" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: predefined.id }) });
    expect(res.status).toBe(404);
  });

  it("no permite editar una categoría de otro usuario", async () => {
    const owner = await prisma.user.create({ data: { email: "owner@example.com", passwordHash: "x" } });
    const other = await prisma.user.create({ data: { email: "other@example.com", passwordHash: "x" } });
    const category = await prisma.category.create({
      data: { userId: owner.id, name: "Privada", type: "expense", color: "#111111" },
    });
    mockUser(other.id);
    const res = await PATCH(makeRequest({ name: "Hackeada" }), { params: Promise.resolve({ id: category.id }) });
    expect(res.status).toBe(404);
  });

  it("no permite borrar una categoría con transacciones vinculadas", async () => {
    const user = await prisma.user.create({ data: { email: "cat4@example.com", passwordHash: "x" } });
    const account = await prisma.account.create({
      data: { userId: user.id, name: "Principal", type: "checking", initialBalanceCents: 0 },
    });
    const category = await prisma.category.create({ data: { userId: user.id, name: "Con gasto", type: "expense", color: "#000" } });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, categoryId: category.id, amountCents: 1000, date: new Date(), type: "expense" },
    });
    mockUser(user.id);
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: category.id }) });
    expect(res.status).toBe(409);
  });
});
