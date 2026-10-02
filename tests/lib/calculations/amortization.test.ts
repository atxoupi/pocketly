import { describe, expect, it } from "vitest";
import { calculateFrenchAmortization } from "@/lib/calculations/amortization";

describe("calculateFrenchAmortization", () => {
  it("genera tantas cuotas como termMonths", () => {
    const installments = calculateFrenchAmortization(1000000, 12, 12);
    expect(installments).toHaveLength(12);
  });

  it("la suma del capital de todas las cuotas cuadra exactamente con el principal", () => {
    const installments = calculateFrenchAmortization(1000000, 12, 12);
    const totalPrincipal = installments.reduce((sum, i) => sum + i.principalCents, 0);
    expect(totalPrincipal).toBe(1000000);
  });

  it("cuadra exactamente incluso con principales que generan redondeos (céntimos impares)", () => {
    const installments = calculateFrenchAmortization(100001, 5, 6);
    const totalPrincipal = installments.reduce((sum, i) => sum + i.principalCents, 0);
    expect(totalPrincipal).toBe(100001);
  });

  it("con tasa 0%, reparte el principal en cuotas iguales sin interés", () => {
    const installments = calculateFrenchAmortization(120000, 0, 12);
    expect(installments.every((i) => i.interestCents === 0)).toBe(true);
    expect(installments.every((i) => i.principalCents === 10000)).toBe(true);
    expect(installments.every((i) => i.totalCents === 10000)).toBe(true);
  });

  it("cuota fija: el interés baja y el capital sube con el tiempo (sistema francés)", () => {
    const installments = calculateFrenchAmortization(1000000, 12, 12);
    expect(installments[0].interestCents).toBeGreaterThan(installments[1].interestCents);
    expect(installments[0].principalCents).toBeLessThan(installments[1].principalCents);
    expect(installments[0].totalCents).toBe(installments[1].totalCents);
  });

  it("el principal pendiente llega exactamente a cero tras la última cuota", () => {
    const installments = calculateFrenchAmortization(1000000, 12, 12);
    const remaining = installments.reduce((rem, i) => rem - i.principalCents, 1000000);
    expect(remaining).toBe(0);
  });
});
