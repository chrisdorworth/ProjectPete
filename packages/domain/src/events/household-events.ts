import type { BaseEvent } from "./base-event.js";

export interface HouseholdFormed extends BaseEvent {
  readonly type: "HouseholdFormed";
  readonly payload: {
    householdId: string;
    memberLeadIds: string[];
    formationReason: "shared_address" | "whitepages_relatives" | "co_ownership" | "manual";
    address: string | null;
    county: string | null;
  };
}

export interface HouseholdMemberAdded extends BaseEvent {
  readonly type: "HouseholdMemberAdded";
  readonly payload: {
    householdId: string;
    leadId: string;
    relationship: string;
    addReason: string;
  };
}

export interface HouseholdValueUpdated extends BaseEvent {
  readonly type: "HouseholdValueUpdated";
  readonly payload: {
    householdId: string;
    previousValueCents: string;
    newValueCents: string;
    memberCount: number;
    trigger: string;
  };
}
