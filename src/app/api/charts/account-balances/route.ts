import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { getAccountBalanceHistory } from "@/lib/calculations/accountBalanceHistory";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get("months") ?? 12);
  const data = await getAccountBalanceHistory(userId, months);
  return NextResponse.json(data);
}
