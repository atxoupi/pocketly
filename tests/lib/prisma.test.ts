import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma client", () => {
  it("conecta y puede crear/leer/borrar un usuario", async () => {
    const user = await prisma.user.create({
      data: { email: "smoke@example.com", passwordHash: "x" },
    });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("smoke@example.com");
  });
});
