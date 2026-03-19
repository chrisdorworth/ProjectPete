"use client";

import { LeadTable } from "@/components/lead-table";

const topLeads = [
  {
    id: "lead-001",
    name: "Robert Chen",
    company: "Apex Holdings",
    score: 92,
    status: "meeting_booked",
    signalType: "inheritance",
    pipelineValue: 15000000,
    lastActivity: "2026-03-19T10:30:00Z",
  },
  {
    id: "lead-002",
    name: "Sarah Mitchell",
    company: "Mitchell Family Trust",
    score: 87,
    status: "qualifying",
    signalType: "home_purchase",
    pipelineValue: 8500000,
    lastActivity: "2026-03-18T16:45:00Z",
  },
  {
    id: "lead-003",
    name: "David Park",
    company: "NovaTech Solutions",
    score: 78,
    status: "contacted",
    signalType: "job_change",
    pipelineValue: 5200000,
    lastActivity: "2026-03-18T09:15:00Z",
  },
  {
    id: "lead-004",
    name: "Emily Russo",
    company: "Russo Ventures",
    score: 74,
    status: "new",
    signalType: "windfall",
    pipelineValue: 12000000,
    lastActivity: "2026-03-19T08:00:00Z",
  },
  {
    id: "lead-005",
    name: "James Okonkwo",
    company: "Okonkwo & Associates",
    score: 65,
    status: "proposal",
    signalType: "filing",
    pipelineValue: 3400000,
    lastActivity: "2026-03-17T14:20:00Z",
  },
];

export function DashboardLeads() {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-text-muted">
        Top Leads by Score
      </h3>
      <LeadTable leads={topLeads} />
    </div>
  );
}
