import { describe, expect, it } from "vitest";
import { getCategoricalColor, hashStringToIndex, CATEGORICAL_CHART_COLORS } from "@/lib/chartColors";

describe("getCategoricalColor", () => {
  it("devuelve siempre el mismo color para el mismo id", () => {
    const color1 = getCategoricalColor("cuenta-abc");
    const color2 = getCategoricalColor("cuenta-abc");
    expect(color1).toBe(color2);
  });

  it("devuelve un color dentro de la paleta categórica", () => {
    const color = getCategoricalColor("cualquier-id");
    expect(CATEGORICAL_CHART_COLORS).toContain(color);
  });

  it("hashStringToIndex siempre devuelve un índice dentro del módulo", () => {
    for (const id of ["a", "bb", "ccc", "cmupyaocl00000a8s38mfn02a"]) {
      const index = hashStringToIndex(id, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });
});
