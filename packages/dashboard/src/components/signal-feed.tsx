import {
  Home,
  Briefcase,
  Baby,
  Heart,
  TrendingUp,
  DollarSign,
  FileText,
  Radio,
} from "lucide-react";
import clsx from "clsx";
import { formatMoney, formatRelativeTime } from "@/lib/format";

const signalIcons: Record<string, React.ElementType> = {
  home_purchase: Home,
  job_change: Briefcase,
  new_child: Baby,
  marriage: Heart,
  inheritance: TrendingUp,
  windfall: DollarSign,
  filing: FileText,
};

const tierColors: Record<string, string> = {
  "1": "border-l-accent",
  "2": "border-l-success",
  "3": "border-l-blue-400",
};

interface Signal {
  id: string;
  type: string;
  source: string;
  tier: string;
  value: number;
  detectedAt: string;
  leadName: string;
  summary: string;
}

interface SignalFeedItemProps {
  signal: Signal;
}

export function SignalFeedItem({ signal }: SignalFeedItemProps) {
  const Icon = signalIcons[signal.type] ?? Radio;

  return (
    <div
      className={clsx(
        "flex items-start gap-4 rounded-lg border border-border border-l-4 bg-surface-raised p-4",
        tierColors[signal.tier] ?? "border-l-text-muted"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-overlay">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">
            {signal.leadName}
          </span>
          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs text-text-muted">
            {signal.source}
          </span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">{signal.summary}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
          <span>{formatRelativeTime(signal.detectedAt)}</span>
          {signal.value > 0 && (
            <span className="font-medium text-success">
              {formatMoney(signal.value)}
            </span>
          )}
          <span className="rounded bg-surface-overlay px-1.5 py-0.5 uppercase">
            Tier {signal.tier}
          </span>
        </div>
      </div>
    </div>
  );
}
