import { z } from "zod";

export const loanSchema = z.object({
  name: z.string().min(1),
  principalCents: z.number().int().positive(),
  annualInterestRatePercent: z.number().min(0),
  startDate: z.coerce.date(),
  termMonths: z.number().int().positive(),
  paymentAccountId: z.string().min(1),
});
