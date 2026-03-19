"use client";

import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { LeadTable } from "@/components/lead-table";
import { useLeads } from "@/lib/queries";
import clsx from "clsx";

const statuses = [
  "all",
  "new",
  "contacted",
  "qualifying",
  "meeting_booked",
  "proposal",
  "won",
  "lost",
] as const;

const statusLabels: Record<string, string> = {
  all: "All",
  new: "New",
  contacted: "Contacted",
  qualifying: "Qualifying",
  meeting_booked: "Meeting Booked",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useLeads({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const leads = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <p className="text-sm text-text-muted">
          Manage and track all prospective leads
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-surface-raised py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-text-muted" />
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === status
                  ? "bg-accent text-white"
                  : "bg-surface-overlay text-text-secondary hover:text-text-primary"
              )}
            >
              {statusLabels[status]}
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
          Failed to load leads. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <LeadTable leads={leads} />

          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Page {page} of {totalPages} ({data?.total ?? 0} total leads)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
