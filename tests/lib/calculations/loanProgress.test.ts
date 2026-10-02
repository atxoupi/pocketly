import { describe, expect, it } from "vitest";
import { buildMonthlyRemainingPrincipalRows, getRemainingPrincipalSeries } from "@/lib/calculations/loanProgress";

describe("getRemainingPrincipalSeries", () => {
  it("calcula el capital pendiente tras cada cuota, llegando a cero en la última", () => {
    const installments = [
      { installmentNumber: 1, principalCents: 3000 },
      { installmentNumber: 2, principalCents: 3500 },
      { installmentNumber: 3, principalCents: 3500 },
    ];
    const series = getRemainingPrincipalSeries(installments);
    expect(series).toEqual([
      { installmentNumber: 1, remainingPrincipalCents: 7000 },
      { installmentNumber: 2, remainingPrincipalCents: 3500 },
      { installmentNumber: 3, remainingPrincipalCents: 0 },
    ]);
  });
});

describe("buildMonthlyRemainingPrincipalRows", () => {
  it("agrupa el capital pendiente de cada préstamo por mes de vencimiento", () => {
    const loans = [
      {
        id: "loan-a",
        installments: [
          { installmentNumber: 1, principalCents: 1000, dueDate: "2026-01-15" },
          { installmentNumber: 2, principalCents: 1000, dueDate: "2026-02-15" },
        ],
      },
      {
        id: "loan-b",
        installments: [{ installmentNumber: 1, principalCents: 500, dueDate: "2026-02-15" }],
      },
    ];
    const { months, rows } = buildMonthlyRemainingPrincipalRows(loans, "2026-02");
    expect(months).toEqual(["2026-01", "2026-02"]);
    expect(rows[0]).toEqual({ month: "2026-01", "loan-a": 10 });
    expect(rows[1]).toEqual({ month: "2026-02", "loan-a": 0, "loan-b": 0 });
  });

  it("incluye el mes actual como ancla aunque ningún préstamo tenga cuota ese mes", () => {
    const loans = [
      { id: "loan-a", installments: [{ installmentNumber: 1, principalCents: 1000, dueDate: "2020-01-15" }] },
    ];
    const { months } = buildMonthlyRemainingPrincipalRows(loans, "2026-10");
    expect(months).toContain("2026-10");
  });
});
