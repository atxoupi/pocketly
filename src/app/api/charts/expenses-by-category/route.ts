import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { getExpensesByCategory } from "@/lib/calculations/expensesByCategory";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const data = await getExpensesByCategory(userId, month);
  return NextResponse.json(data);
}
