import { prisma } from "@/lib/prisma";
import { comparePassword } from "./password";

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, email: user.email };
}
