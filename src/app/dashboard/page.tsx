import { UpcomingDueBanner } from "@/components/dashboard/UpcomingDueBanner";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Resumen</h2>
      <UpcomingDueBanner />
    </div>
  );
}
