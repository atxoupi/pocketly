import { z } from "zod";

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amountCents: z.number().int().positive(),
    date: z.coerce.date(),
    note: z.string().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "La cuenta de origen y destino deben ser distintas",
    path: ["toAccountId"],
  });
