import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

interface KpiCardProps {
  label: string;
  value: string;
  change: number;
  period?: string;
}

export function KpiCard({ label, value, change, period = "vs last week" }: KpiCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-danger" />
        )}
        <span
          className={clsx(
            "text-sm font-medium",
            isPositive ? "text-success" : "text-danger"
          )}
        >
          {isPositive ? "+" : ""}
          {change}%
        </span>
        <span className="text-xs text-text-muted">{period}</span>
      </div>
    </div>
  );
}
