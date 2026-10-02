export type RecurrenceRule = "monthly" | "weekly";

export function nextOccurrence(date: Date, rule: RecurrenceRule): Date {
  const next = new Date(date);
  if (rule === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

export function occurrencesUpTo(lastDate: Date, rule: RecurrenceRule, cutoff: Date): Date[] {
  const result: Date[] = [];
  let current = nextOccurrence(lastDate, rule);
  while (current.getTime() <= cutoff.getTime()) {
    result.push(new Date(current));
    current = nextOccurrence(current, rule);
  }
  return result;
}
