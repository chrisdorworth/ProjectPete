import * as SecureStore from "expo-secure-store";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.meridian.local/v1";

const TOKEN_KEY = "meridian_auth_token";

interface ApiError {
  status: number;
  message: string;
}

export class ApiClientError extends Error {
  readonly status: number;
  constructor({ status, message }: ApiError) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiClientError({
      status: response.status,
      message: errorBody?.message ?? response.statusText,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },

  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
} as const;

export interface Lead {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  score: number;
  signalType: string;
  pipelineValueCents: number;
  territory: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface Signal {
  id: string;
  leadId: string;
  leadName: string;
  type: string;
  source: string;
  tier: "T1" | "T2" | "T3";
  valueCents: number;
  description: string;
  createdAt: string;
}

export interface MeetingBrief {
  leadId: string;
  leadName: string;
  company: string;
  score: number;
  talkingPoints: string[];
  rapportHooks: string[];
  recentSignals: Signal[];
  enrichmentData: Record<string, string>;
  preparedAt: string;
}

export interface DashboardKpis {
  newLeadsCount: number;
  newLeadsTrend: number;
  meetingsTodayCount: number;
  meetingsTodayTrend: number;
  pipelineValueCents: number;
  pipelineValueTrend: number;
  conversionRate: number;
  conversionRateTrend: number;
}

export interface TimelineEvent {
  id: string;
  type: "call" | "email" | "meeting" | "signal" | "note" | "status_change";
  title: string;
  description: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  territory: string;
  avatarUrl: string | null;
  notificationPreferences: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    t1Signals: boolean;
    t2Signals: boolean;
    t3Signals: boolean;
    meetingReminders: boolean;
  };
}
