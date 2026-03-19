"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserX,
  RefreshCw,
  UserPlus,
  Mail,
  Phone,
  Building,
  MapPin,
  Users,
} from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import { StatusPill } from "@/components/status-pill";
import { Timeline } from "@/components/timeline";
import { useLead, useLeadTimeline, useSuppressLead, useRescoreLead } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: lead, isLoading, error } = useLead(id);
  const { data: timeline } = useLeadTimeline(id);
  const suppressMutation = useSuppressLead();
  const rescoreMutation = useRescoreLead();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger-light">
          Lead not found or failed to load.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <ScoreBadge score={lead.score} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{lead.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <StatusPill status={lead.status} />
              <span className="text-sm text-text-muted">{lead.signalType}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Assign dialog")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light"
          >
            <UserPlus className="h-4 w-4" /> Assign
          </button>
          <button
            onClick={() => rescoreMutation.mutate(id)}
            disabled={rescoreMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" /> Re-score
          </button>
          <button
            onClick={() => suppressMutation.mutate(id)}
            disabled={suppressMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
          >
            <UserX className="h-4 w-4" /> Suppress
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact & Enrichment */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <h3 className="mb-4 text-sm font-medium text-text-muted">
              Contact Information
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-text-muted" />
                <dd className="text-text-primary">{lead.email}</dd>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-text-muted" />
                  <dd className="text-text-primary">{lead.phone}</dd>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-text-muted" />
                <dd className="text-text-primary">{lead.company}</dd>
              </div>
              {lead.territory && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-text-muted" />
                  <dd className="text-text-primary">{lead.territory}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <h3 className="mb-4 text-sm font-medium text-text-muted">
              Score Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: "Signal Strength", value: 35, max: 40 },
                { label: "Enrichment Quality", value: 22, max: 25 },
                { label: "Engagement", value: 18, max: 20 },
                { label: "Fit Score", value: 12, max: 15 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="text-text-primary">
                      {item.value}/{item.max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-overlay">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <h3 className="mb-4 text-sm font-medium text-text-muted">
              Pipeline
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Est. Value</dt>
                <dd className="font-medium text-text-primary">
                  {formatMoney(lead.pipelineValue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Created</dt>
                <dd className="text-text-primary">{formatDate(lead.createdAt)}</dd>
              </div>
              {lead.assignedTo && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Assigned To</dt>
                  <dd className="text-text-primary">{lead.assignedTo}</dd>
                </div>
              )}
            </dl>
          </div>

          {lead.rapportHooks && lead.rapportHooks.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-raised p-5">
              <h3 className="mb-4 text-sm font-medium text-text-muted">
                Rapport Hooks
              </h3>
              <ul className="space-y-2">
                {lead.rapportHooks.map((hook, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-surface-overlay px-3 py-2 text-sm text-text-secondary"
                  >
                    {hook}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lead.householdId && (
            <div className="rounded-xl border border-border bg-surface-raised p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted">
                <Users className="h-4 w-4" /> Household
              </h3>
              <p className="text-sm text-text-secondary">
                Household ID: {lead.householdId}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface-raised p-5">
            <h3 className="mb-6 text-sm font-medium text-text-muted">
              Activity Timeline
            </h3>
            {timeline && timeline.length > 0 ? (
              <Timeline events={timeline} />
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                No activity recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
