import { prisma } from "@/lib/prisma";
import { occurrencesUpTo, type RecurrenceRule } from "./recurrence";

export async function generateDueRecurringTransactions(userId: string, cutoff: Date = new Date()): Promise<number> {
  const templates = await prisma.transaction.findMany({
    where: { userId, isRecurring: true, recurringSourceId: null, recurrenceRule: { not: null } },
  });

  let created = 0;
  for (const template of templates) {
    const lastInstance = await prisma.transaction.findFirst({
      where: { OR: [{ id: template.id }, { recurringSourceId: template.id }] },
      orderBy: { date: "desc" },
    });
    const lastDate = lastInstance?.date ?? template.date;
    const rule = template.recurrenceRule as RecurrenceRule;
    const dates = occurrencesUpTo(lastDate, rule, cutoff);

    for (const date of dates) {
      await prisma.transaction.create({
        data: {
          userId: template.userId,
          accountId: template.accountId,
          categoryId: template.categoryId,
          amountCents: template.amountCents,
          date,
          type: template.type,
          note: template.note,
          isRecurring: true,
          recurrenceRule: template.recurrenceRule,
          recurringSourceId: template.id,
        },
      });
      created += 1;
    }
  }
  return created;
}
