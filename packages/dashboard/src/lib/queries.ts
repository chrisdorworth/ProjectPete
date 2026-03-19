"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeads,
  fetchLead,
  fetchSignals,
  fetchOutreachQueue,
  fetchOutreachStats,
  fetchAnalytics,
  fetchLeadTimeline,
  updateLead,
  suppressLead,
  rescoreLead,
  approveOutreach,
  rejectOutreach,
  type LeadListParams,
  type SignalListParams,
} from "./api";

export const queryKeys = {
  leads: {
    all: ["leads"] as const,
    list: (params?: LeadListParams) => ["leads", "list", params] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
    timeline: (id: string) => ["leads", "timeline", id] as const,
  },
  signals: {
    all: ["signals"] as const,
    list: (params?: SignalListParams) => ["signals", "list", params] as const,
  },
  outreach: {
    all: ["outreach"] as const,
    queue: ["outreach", "queue"] as const,
    stats: ["outreach", "stats"] as const,
  },
  analytics: ["analytics"] as const,
};

// Leads
export function useLeads(params?: LeadListParams) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => fetchLeads(params),
    staleTime: 30_000,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => fetchLead(id),
    staleTime: 60_000,
  });
}

export function useLeadTimeline(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.timeline(id),
    queryFn: () => fetchLeadTimeline(id),
    staleTime: 30_000,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateLead>[1] }) =>
      updateLead(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useSuppressLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppressLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useRescoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rescoreLead(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

// Signals
export function useSignals(params?: SignalListParams) {
  return useQuery({
    queryKey: queryKeys.signals.list(params),
    queryFn: () => fetchSignals(params),
    staleTime: 15_000,
  });
}

// Outreach
export function useOutreachQueue() {
  return useQuery({
    queryKey: queryKeys.outreach.queue,
    queryFn: fetchOutreachQueue,
    staleTime: 15_000,
  });
}

export function useOutreachStats() {
  return useQuery({
    queryKey: queryKeys.outreach.stats,
    queryFn: fetchOutreachStats,
    staleTime: 60_000,
  });
}

export function useApproveOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveOutreach(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outreach.all });
    },
  });
}

export function useRejectOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectOutreach(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outreach.all });
    },
  });
}

// Analytics
export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: fetchAnalytics,
    staleTime: 120_000,
  });
}
