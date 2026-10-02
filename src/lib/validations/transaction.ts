import { z } from "zod";

export const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  amountCents: z.number().int().positive(),
  date: z.coerce.date(),
  type: z.enum(["income", "expense"]),
  note: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.enum(["monthly", "weekly"]).optional(),
});
