import clsx from "clsx";

type LeadStatus =
  | "new"
  | "contacted"
  | "qualifying"
  | "meeting_booked"
  | "proposal"
  | "won"
  | "lost"
  | "suppressed";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-500/20 text-blue-400" },
  contacted: { label: "Contacted", className: "bg-purple-500/20 text-purple-400" },
  qualifying: { label: "Qualifying", className: "bg-amber-500/20 text-amber-400" },
  meeting_booked: { label: "Meeting Booked", className: "bg-cyan-500/20 text-cyan-400" },
  proposal: { label: "Proposal", className: "bg-indigo-500/20 text-indigo-400" },
  won: { label: "Won", className: "bg-success/20 text-success-light" },
  lost: { label: "Lost", className: "bg-danger/20 text-danger-light" },
  suppressed: { label: "Suppressed", className: "bg-gray-500/20 text-gray-400" },
};

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const config = statusConfig[status as LeadStatus] ?? {
    label: status,
    className: "bg-gray-500/20 text-gray-400",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
