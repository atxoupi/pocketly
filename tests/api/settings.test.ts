import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifyCredentials } from "@/lib/auth/verifyCredentials";

vi.mock("@/lib/auth/session", () => ({ getCurrentUserId: vi.fn() }));
import { getCurrentUserId } from "@/lib/auth/session";
import { GET, PATCH } from "@/app/api/me/route";
import { PATCH as CHANGE_PASSWORD } from "@/app/api/me/password/route";

function mockUser(userId: string) {
  (getCurrentUserId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(userId);
}

function makeRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET/PATCH /api/me", () => {
  it("GET devuelve el % de ahorro objetivo actual", async () => {
    const user = await prisma.user.create({ data: { email: "me@example.com", passwordHash: "x", savingsGoalPercent: 15 } });
    mockUser(user.id);
    const res = await GET();
    const data = await res.json();
    expect(data.savingsGoalPercent).toBe(15);
  });

  it("PATCH actualiza el % de ahorro objetivo", async () => {
    const user = await prisma.user.create({ data: { email: "me2@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const res = await PATCH(makeRequest({ savingsGoalPercent: 30 }));
    expect(res.status).toBe(200);
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.savingsGoalPercent).toBe(30);
  });

  it("rechaza un % fuera de rango", async () => {
    const user = await prisma.user.create({ data: { email: "me3@example.com", passwordHash: "x" } });
    mockUser(user.id);
    const res = await PATCH(makeRequest({ savingsGoalPercent: 150 }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/me/password", () => {
  it("cambia la contraseña con la actual correcta", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({ data: { email: "pwd@example.com", passwordHash } });
    mockUser(user.id);
    const res = await CHANGE_PASSWORD(makeRequest({ currentPassword: "password123", newPassword: "nuevaClave456" }));
    expect(res.status).toBe(200);
    const verified = await verifyCredentials("pwd@example.com", "nuevaClave456");
    expect(verified).not.toBeNull();
  });

  it("rechaza si la contraseña actual es incorrecta", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({ data: { email: "pwd2@example.com", passwordHash } });
    mockUser(user.id);
    const res = await CHANGE_PASSWORD(makeRequest({ currentPassword: "mala", newPassword: "nuevaClave456" }));
    expect(res.status).toBe(401);
  });

  it("rechaza una contraseña nueva demasiado corta", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({ data: { email: "pwd3@example.com", passwordHash } });
    mockUser(user.id);
    const res = await CHANGE_PASSWORD(makeRequest({ currentPassword: "password123", newPassword: "123" }));
    expect(res.status).toBe(400);
  });
});
