import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/category";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const category = await prisma.category.create({ data: { ...parsed.data, userId } });
  return NextResponse.json(category, { status: 201 });
}
