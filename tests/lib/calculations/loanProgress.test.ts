import { describe, expect, it } from "vitest";
import { getRemainingPrincipalSeries } from "@/lib/calculations/loanProgress";

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
