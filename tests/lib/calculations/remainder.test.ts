import { describe, expect, it } from "vitest";
import { calculateRemainderCents, calculateSavingsPercent, getSavingsStatus } from "@/lib/calculations/remainder";

describe("remainder calculations", () => {
  it("calcula el remanente como ingresos menos gastos", () => {
    expect(calculateRemainderCents(150000, 90000)).toBe(60000);
  });

  it("calcula el % de ahorro real sobre los ingresos", () => {
    expect(calculateSavingsPercent(60000, 150000)).toBeCloseTo(40);
  });

  it("devuelve null si no hubo ingresos", () => {
    expect(calculateSavingsPercent(0, 0)).toBeNull();
  });

  it("marca 'exceeded' si el % real supera el objetivo", () => {
    expect(getSavingsStatus(40, 20)).toBe("exceeded");
  });

  it("marca 'met' si el % real iguala el objetivo", () => {
    expect(getSavingsStatus(20, 20)).toBe("met");
  });

  it("marca 'not-met' si el % real es menor que el objetivo", () => {
    expect(getSavingsStatus(10, 20)).toBe("not-met");
  });
});
