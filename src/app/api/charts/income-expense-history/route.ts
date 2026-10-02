import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { getIncomeExpenseHistory } from "@/lib/calculations/incomeExpenseHistory";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get("months") ?? 12);
  const history = await getIncomeExpenseHistory(userId, months);
  return NextResponse.json(history);
}
