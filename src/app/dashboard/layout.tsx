import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { generateDueRecurringTransactions } from "@/lib/calculations/generateRecurringTransactions";
import { TopNav } from "@/components/dashboard/TopNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await generateDueRecurringTransactions(session.user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
