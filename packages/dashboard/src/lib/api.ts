const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("meridian_token");
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Leads
export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  status: string;
  signalType: string;
  pipelineValue: number;
  lastActivity: string;
  phone?: string;
  territory?: string;
  assignedTo?: string;
  householdId?: string;
  enrichment?: Record<string, unknown>;
  rapportHooks?: string[];
  createdAt: string;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function fetchLeads(params?: LeadListParams) {
  return request<PaginatedResponse<Lead>>("/leads", { params: params as Record<string, string | number | boolean | undefined> });
}

export function fetchLead(id: string) {
  return request<Lead>(`/leads/${id}`);
}

export function updateLead(id: string, data: Partial<Lead>) {
  return request<Lead>(`/leads/${id}`, { method: "PATCH", body: data });
}

export function suppressLead(id: string) {
  return request<void>(`/leads/${id}/suppress`, { method: "POST" });
}

export function rescoreLead(id: string) {
  return request<Lead>(`/leads/${id}/rescore`, { method: "POST" });
}

// Signals
export interface Signal {
  id: string;
  type: string;
  source: string;
  tier: string;
  value: number;
  detectedAt: string;
  leadName: string;
  leadId: string;
  summary: string;
}

export interface SignalListParams {
  page?: number;
  limit?: number;
  tier?: string;
  type?: string;
}

export function fetchSignals(params?: SignalListParams) {
  return request<PaginatedResponse<Signal>>("/signals", { params: params as Record<string, string | number | boolean | undefined> });
}

// Outreach
export interface OutreachMessage {
  id: string;
  leadId: string;
  leadName: string;
  channel: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "delivered" | "opened" | "clicked" | "replied";
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  createdAt: string;
}

export interface OutreachStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export function fetchOutreachQueue() {
  return request<PaginatedResponse<OutreachMessage>>("/outreach/queue");
}

export function fetchOutreachStats() {
  return request<OutreachStats>("/outreach/stats");
}

export function approveOutreach(id: string) {
  return request<OutreachMessage>(`/outreach/${id}/approve`, { method: "POST" });
}

export function rejectOutreach(id: string) {
  return request<void>(`/outreach/${id}/reject`, { method: "POST" });
}

// Analytics
export interface AnalyticsData {
  conversionFunnel: { stage: string; count: number }[];
  channelPerformance: { channel: string; leads: number; conversions: number; revenue: number }[];
  signalSourceROI: { source: string; cost: number; revenue: number; roi: number }[];
  repLeaderboard: { name: string; leads: number; conversions: number; revenue: number }[];
  timeToContact: { bucket: string; count: number }[];
}

export function fetchAnalytics() {
  return request<AnalyticsData>("/analytics");
}

// Timeline
export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export function fetchLeadTimeline(leadId: string) {
  return request<TimelineEvent[]>(`/leads/${leadId}/timeline`);
}
