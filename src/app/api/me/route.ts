import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { updateSavingsGoalSchema } from "@/lib/validations/settings";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, savingsGoalPercent: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await request.json();
  const parsed = updateSavingsGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { savingsGoalPercent: parsed.data.savingsGoalPercent },
    select: { id: true, email: true, savingsGoalPercent: true },
  });
  return NextResponse.json(user);
}
