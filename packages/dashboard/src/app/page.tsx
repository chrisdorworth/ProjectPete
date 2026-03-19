import { KpiCard } from "@/components/kpi-card";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardLeads } from "./dashboard-leads";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">
          Lead management overview and signal intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New Leads Today" value="24" change={12.5} />
        <KpiCard label="Conversion Rate" value="18.3%" change={2.1} />
        <KpiCard label="Pipeline Value" value="$2.4M" change={-3.2} />
        <KpiCard label="Meetings Booked" value="8" change={33.3} />
      </div>

      <DashboardCharts />
      <DashboardLeads />
    </div>
  );
}
