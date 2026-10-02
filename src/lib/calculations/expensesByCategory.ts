import { prisma } from "@/lib/prisma";

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  amountCents: number;
}

const MAX_OWN_CATEGORIES = 7;

export async function getExpensesByCategory(userId: string, month: string): Promise<CategoryExpense[]> {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "expense", date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
  });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const sorted = grouped
    .map((g) => ({
      categoryId: g.categoryId,
      categoryName: categoryNameById.get(g.categoryId) ?? "Desconocida",
      amountCents: g._sum.amountCents ?? 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  if (sorted.length <= MAX_OWN_CATEGORIES) {
    return sorted;
  }

  const top = sorted.slice(0, MAX_OWN_CATEGORIES);
  const rest = sorted.slice(MAX_OWN_CATEGORIES);
  const otherAmount = rest.reduce((sum, c) => sum + c.amountCents, 0);

  return [...top, { categoryId: "other", categoryName: "Otros", amountCents: otherAmount }];
}
