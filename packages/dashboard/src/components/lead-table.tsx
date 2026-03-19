"use client";

import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { ScoreBadge } from "./score-badge";
import { StatusPill } from "./status-pill";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import { useState } from "react";
import clsx from "clsx";

interface Lead {
  id: string;
  name: string;
  company: string;
  score: number;
  status: string;
  signalType: string;
  pipelineValue: number;
  lastActivity: string;
}

interface LeadTableProps {
  leads: Lead[];
}

type SortField = "name" | "score" | "pipelineValue" | "lastActivity";
type SortDir = "asc" | "desc";

export function LeadTable({ leads }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...leads].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return mul * a.name.localeCompare(b.name);
    if (sortField === "score") return mul * (a.score - b.score);
    if (sortField === "pipelineValue")
      return mul * (a.pipelineValue - b.pipelineValue);
    if (sortField === "lastActivity")
      return mul * (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime());
    return 0;
  });

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 text-left"
      >
        {children}
        <ArrowUpDown
          className={clsx(
            "h-3.5 w-3.5",
            sortField === field ? "text-accent" : "text-text-muted"
          )}
        />
      </button>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-left text-text-muted">
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">
              <SortHeader field="name">Name</SortHeader>
            </th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Signal</th>
            <th className="px-4 py-3 font-medium">
              <SortHeader field="pipelineValue">Value</SortHeader>
            </th>
            <th className="px-4 py-3 font-medium">
              <SortHeader field="lastActivity">Last Activity</SortHeader>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-border transition-colors hover:bg-surface-overlay"
            >
              <td className="px-4 py-3">
                <ScoreBadge score={lead.score} size="sm" />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-text-primary hover:text-accent"
                >
                  {lead.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-secondary">{lead.company}</td>
              <td className="px-4 py-3">
                <StatusPill status={lead.status} />
              </td>
              <td className="px-4 py-3 text-text-secondary">{lead.signalType}</td>
              <td className="px-4 py-3 font-medium text-text-primary">
                {formatMoney(lead.pipelineValue)}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {formatRelativeTime(lead.lastActivity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
