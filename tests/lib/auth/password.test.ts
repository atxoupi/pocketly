import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "@/lib/auth/password";

describe("password utils", () => {
  it("hashea y verifica correctamente una contraseña correcta", async () => {
    const hash = await hashPassword("password123");
    expect(await comparePassword("password123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("password123");
    expect(await comparePassword("otra-cosa", hash)).toBe(false);
  });
});
