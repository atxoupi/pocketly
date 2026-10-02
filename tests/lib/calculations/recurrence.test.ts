import { describe, expect, it } from "vitest";
import { occurrencesUpTo } from "@/lib/calculations/recurrence";

describe("occurrencesUpTo", () => {
  it("genera las fechas mensuales pendientes hasta el corte", () => {
    const last = new Date("2026-08-01");
    const cutoff = new Date("2026-10-15");
    const dates = occurrencesUpTo(last, "monthly", cutoff);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-09-01", "2026-10-01"]);
  });

  it("no genera nada si el corte es anterior a la siguiente ocurrencia", () => {
    const last = new Date("2026-10-01");
    const cutoff = new Date("2026-10-15");
    const dates = occurrencesUpTo(last, "monthly", cutoff);
    expect(dates).toEqual([]);
  });

  it("genera ocurrencias semanales", () => {
    const last = new Date("2026-10-01");
    const cutoff = new Date("2026-10-16");
    const dates = occurrencesUpTo(last, "weekly", cutoff);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-10-08", "2026-10-15"]);
  });
});
