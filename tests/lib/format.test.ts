import { describe, expect, it } from "vitest";
import { formatCurrencyCents } from "@/lib/format";

describe("formatCurrencyCents", () => {
  it("formatea céntimos como euros en formato español", () => {
    const expected = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(1234.56);
    expect(formatCurrencyCents(123456)).toBe(expected);
  });

  it("formatea cero correctamente", () => {
    const expected = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(0);
    expect(formatCurrencyCents(0)).toBe(expected);
  });
});
