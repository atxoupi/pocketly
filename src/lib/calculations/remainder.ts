export function calculateRemainderCents(incomeCents: number, expenseCents: number): number {
  return incomeCents - expenseCents;
}

export function calculateSavingsPercent(remainderCents: number, incomeCents: number): number | null {
  if (incomeCents === 0) return null;
  return (remainderCents / incomeCents) * 100;
}

export type SavingsStatus = "met" | "exceeded" | "not-met";

export function getSavingsStatus(actualPercent: number | null, goalPercent: number): SavingsStatus {
  if (actualPercent === null) return "not-met";
  if (actualPercent > goalPercent) return "exceeded";
  if (actualPercent === goalPercent) return "met";
  return "not-met";
}
