import { describe, expect, it } from "vitest";
import { calculateTermForFixedPayment } from "@/lib/calculations/amortization";

describe("calculateTermForFixedPayment", () => {
  it("calcula el número de cuotas (redondeado hacia arriba) para una cuota fija dada", () => {
    const n = calculateTermForFixedPayment(100000, 12, 10000);
    expect(n).toBe(11);
  });

  it("con tasa 0%, es una simple división redondeada hacia arriba", () => {
    const n = calculateTermForFixedPayment(10000, 0, 3000);
    expect(n).toBe(4);
  });

  it("lanza un error si la cuota no cubre ni el interés mensual", () => {
    expect(() => calculateTermForFixedPayment(100000, 12, 900)).toThrow();
  });
});
