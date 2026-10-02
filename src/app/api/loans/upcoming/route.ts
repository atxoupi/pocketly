import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { getUpcomingInstallments } from "@/lib/calculations/upcomingInstallments";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const upcoming = await getUpcomingInstallments(userId);
  return NextResponse.json(upcoming);
}
