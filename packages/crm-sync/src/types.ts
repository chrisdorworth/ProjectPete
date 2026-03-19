export interface CrmContact {
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  tags: string[];
  customFields: Record<string, string>;
}

export interface CrmActivity {
  type: "email" | "call" | "meeting" | "note" | "task";
  subject: string;
  body: string;
  contactExternalId: string;
  date: Date;
  metadata: Record<string, string>;
}

export interface CrmOpportunity {
  externalId?: string;
  contactExternalId: string;
  name: string;
  stageName: string;
  amountCents: number;
  closeDate: Date;
  source: string;
}

export interface SyncResult {
  success: boolean;
  externalId: string | null;
  error: string | null;
  action: "created" | "updated" | "skipped";
}

export interface CrmAdapter {
  name: string;
  syncContact(contact: CrmContact): Promise<SyncResult>;
  syncActivity(activity: CrmActivity): Promise<SyncResult>;
  syncOpportunity(opportunity: CrmOpportunity): Promise<SyncResult>;
  findContact(email: string): Promise<CrmContact | null>;
  testConnection(): Promise<boolean>;
}
