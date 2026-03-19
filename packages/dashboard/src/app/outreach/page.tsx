"use client";

import {
  Send,
  Mail,
  Eye,
  MousePointer,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { useOutreachQueue, useOutreachStats, useApproveOutreach, useRejectOutreach } from "@/lib/queries";
import { KpiCard } from "@/components/kpi-card";
import { formatRelativeTime } from "@/lib/format";
import clsx from "clsx";

const statusIcons: Record<string, React.ElementType> = {
  draft: Mail,
  sent: Send,
  delivered: Check,
  opened: Eye,
  clicked: MousePointer,
  replied: MessageSquare,
};

const statusColors: Record<string, string> = {
  draft: "text-amber-400",
  sent: "text-blue-400",
  delivered: "text-cyan-400",
  opened: "text-green-400",
  clicked: "text-purple-400",
  replied: "text-accent",
};

export default function OutreachPage() {
  const { data: stats } = useOutreachStats();
  const { data: queue, isLoading } = useOutreachQueue();
  const approveMutation = useApproveOutreach();
  const rejectMutation = useRejectOutreach();

  const messages = queue?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Outreach</h1>
        <p className="text-sm text-text-muted">
          Review drafts, track delivery, and manage campaigns
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Sent"
            value={String(stats.totalSent)}
            change={5.2}
          />
          <KpiCard
            label="Open Rate"
            value={`${(stats.openRate * 100).toFixed(1)}%`}
            change={1.8}
          />
          <KpiCard
            label="Click Rate"
            value={`${(stats.clickRate * 100).toFixed(1)}%`}
            change={-0.5}
          />
          <KpiCard
            label="Replies"
            value={String(stats.replied)}
            change={12.0}
          />
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Draft Review Queue
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-text-muted">
            No drafts awaiting review.
          </p>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const Icon = statusIcons[msg.status] ?? Mail;
            return (
              <div
                key={msg.id}
                className="rounded-xl border border-border bg-surface-raised p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-overlay",
                        statusColors[msg.status]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">
                        {msg.subject}
                      </p>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        To: {msg.leadName} via {msg.channel}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                        {msg.body}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>

                  {msg.status === "draft" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => approveMutation.mutate(msg.id)}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-success/20 px-3 py-1.5 text-sm font-medium text-success-light transition-colors hover:bg-success/30"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(msg.id)}
                        disabled={rejectMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-danger/20 px-3 py-1.5 text-sm font-medium text-danger-light transition-colors hover:bg-danger/30"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
