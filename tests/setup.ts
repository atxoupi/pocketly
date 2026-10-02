import { afterAll, afterEach, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Los tests deben ejecutarse contra la base de datos de test (DATABASE_URL debe contener 'test')."
    );
  }
});

afterEach(async () => {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.loanInstallment.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
