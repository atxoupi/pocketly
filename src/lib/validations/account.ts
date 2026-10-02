import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  initialBalanceCents: z.number().int(),
});
