"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { SignalFeedItem } from "@/components/signal-feed";
import { useSignals } from "@/lib/queries";
import clsx from "clsx";

const tiers = ["all", "1", "2", "3"] as const;
const signalTypes = [
  "all",
  "home_purchase",
  "job_change",
  "new_child",
  "marriage",
  "inheritance",
  "windfall",
  "filing",
] as const;

const typeLabels: Record<string, string> = {
  all: "All Types",
  home_purchase: "Home Purchase",
  job_change: "Job Change",
  new_child: "New Child",
  marriage: "Marriage",
  inheritance: "Inheritance",
  windfall: "Windfall",
  filing: "Filing",
};

export default function SignalsPage() {
  const [tierFilter, setTierFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, error } = useSignals({
    tier: tierFilter === "all" ? undefined : tierFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  const signals = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Signal Feed</h1>
        <p className="text-sm text-text-muted">
          Real-time intelligence signals from all sources
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-xs text-text-muted">Tier:</span>
          {tiers.map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tierFilter === tier
                  ? "bg-accent text-white"
                  : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              )}
            >
              {tier === "all" ? "All Tiers" : `Tier ${tier}`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-muted">Type:</span>
          {signalTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === type
                  ? "bg-accent text-white"
                  : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              )}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger-light">
          Failed to load signals. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {signals.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted">
              No signals match the current filters.
            </p>
          ) : (
            signals.map((signal) => (
              <SignalFeedItem key={signal.id} signal={signal} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
