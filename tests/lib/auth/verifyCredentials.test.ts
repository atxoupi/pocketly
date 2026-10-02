import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifyCredentials } from "@/lib/auth/verifyCredentials";

describe("verifyCredentials", () => {
  it("devuelve el usuario si el email y la contraseña son correctos", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email: "login@example.com", passwordHash },
    });
    const result = await verifyCredentials("login@example.com", "password123");
    expect(result).toEqual({ id: user.id, email: user.email });
  });

  it("devuelve null si la contraseña es incorrecta", async () => {
    const passwordHash = await hashPassword("password123");
    await prisma.user.create({ data: { email: "login2@example.com", passwordHash } });
    const result = await verifyCredentials("login2@example.com", "mala-contraseña");
    expect(result).toBeNull();
  });

  it("devuelve null si el email no existe", async () => {
    const result = await verifyCredentials("no-existe@example.com", "password123");
    expect(result).toBeNull();
  });
});
