import { z } from "zod";

export const earlyRepaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  mode: z.enum(["reduce-payment", "reduce-term"]),
});
