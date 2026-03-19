"use client";

import {
  Mail,
  Phone,
  Calendar,
  FileText,
  Radio,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { formatDate, formatRelativeTime } from "@/lib/format";

const eventIcons: Record<string, React.ElementType> = {
  email_sent: Mail,
  email_opened: Mail,
  call: Phone,
  meeting: Calendar,
  note: FileText,
  signal_detected: Radio,
  assigned: UserPlus,
};

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface TimelineProps {
  events: TimelineEvent[];
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = eventIcons[event.type] ?? FileText;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border last:hidden" />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-overlay">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{event.title}</p>
          <span className="shrink-0 text-xs text-text-muted">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatDate(event.timestamp)}
        </p>
        {event.description && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            {expanded ? "Hide details" : "Show details"}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
        {expanded && (
          <div className="mt-2 rounded-lg bg-surface-overlay p-3 text-sm text-text-secondary">
            <p>{event.description}</p>
            {event.metadata && (
              <dl className="mt-2 space-y-1 text-xs">
                {Object.entries(event.metadata).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="font-medium text-text-muted">{key}:</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </div>
  );
}
