import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { generateDueRecurringTransactions } from "@/lib/calculations/generateRecurringTransactions";
import { TopNav } from "@/components/dashboard/TopNav";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { BottomTabBar } from "@/components/dashboard/BottomTabBar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await generateDueRecurringTransactions(session.user.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <MobileHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 md:pb-6">{children}</main>
      <BottomTabBar />
    </div>
  );
}
