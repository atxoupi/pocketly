import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware", () => {
  it("redirige a / si no hay token", async () => {
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("deja pasar si hay token", async () => {
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "u1" });
    const res = await middleware(makeRequest("/dashboard"));
    expect(res.status).toBe(200);
  });
});
