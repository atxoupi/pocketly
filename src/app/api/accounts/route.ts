import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { accountSchema } from "@/lib/validations/account";
import { getAccountBalanceCents } from "@/lib/calculations/accountBalance";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const withBalances = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balanceCents: await getAccountBalanceCents(account.id),
    }))
  );
  return NextResponse.json(withBalances);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await request.json();
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const account = await prisma.account.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(account, { status: 201 });
}
