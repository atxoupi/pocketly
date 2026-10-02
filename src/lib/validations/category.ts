import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
