import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/category";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const category = await prisma.category.update({ where: { id }, data: parsed.data });
  return NextResponse.json(category);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
