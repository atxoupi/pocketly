import { z } from "zod";

export const updateSavingsGoalSchema = z.object({
  savingsGoalPercent: z.number().min(0).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
