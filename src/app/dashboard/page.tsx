import { StatCards } from "@/components/dashboard/StatCards";
import { UpcomingDueBanner } from "@/components/dashboard/UpcomingDueBanner";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";
import { RemainderChart } from "@/components/charts/RemainderChart";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart";
import { LoanProgressChart } from "@/components/charts/LoanProgressChart";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Resumen</h2>
      <StatCards />
      <UpcomingDueBanner />
      <AccountBalanceChart />
      <RemainderChart />
      <ExpensesByCategoryChart />
      <IncomeVsExpenseChart />
      <LoanProgressChart />
    </div>
  );
}
