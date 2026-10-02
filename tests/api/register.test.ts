import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/register/route";
import { prisma } from "@/lib/prisma";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/register", () => {
  it("crea un usuario con categorías predefinidas", async () => {
    const res = await POST(makeRequest({ email: "ana@example.com", password: "password123" }));
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "ana@example.com" } });
    expect(user).not.toBeNull();
    const categories = await prisma.category.findMany({ where: { userId: user!.id } });
    expect(categories.length).toBe(9);
  });

  it("rechaza un email duplicado", async () => {
    await POST(makeRequest({ email: "dup@example.com", password: "password123" }));
    const res = await POST(makeRequest({ email: "dup@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("rechaza un payload inválido", async () => {
    const res = await POST(makeRequest({ email: "no-es-email", password: "123" }));
    expect(res.status).toBe(400);
  });
});
