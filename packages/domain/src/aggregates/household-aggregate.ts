import type { MeridianEvent } from "../events/index.js";

export interface HouseholdState {
  id: string;
  memberLeadIds: string[];
  address: string | null;
  county: string | null;
  combinedValueCents: bigint;
  combinedWealthCents: bigint;
  highestScore: number;
  memberCount: number;
  version: number;
  createdAt: Date;
}

export function createInitialHouseholdState(): HouseholdState {
  return {
    id: "",
    memberLeadIds: [],
    address: null,
    county: null,
    combinedValueCents: 0n,
    combinedWealthCents: 0n,
    highestScore: 0,
    memberCount: 0,
    version: 0,
    createdAt: new Date(),
  };
}

export function applyHouseholdEvent(
  state: HouseholdState,
  event: MeridianEvent,
): HouseholdState {
  switch (event.type) {
    case "HouseholdFormed":
      return {
        ...state,
        id: event.payload.householdId,
        memberLeadIds: event.payload.memberLeadIds,
        address: event.payload.address,
        county: event.payload.county,
        memberCount: event.payload.memberLeadIds.length,
        version: event.version,
        createdAt: event.timestamp,
      };

    case "HouseholdMemberAdded": {
      if (state.memberLeadIds.includes(event.payload.leadId)) {
        return state;
      }
      const newMembers = [...state.memberLeadIds, event.payload.leadId];
      return {
        ...state,
        memberLeadIds: newMembers,
        memberCount: newMembers.length,
        version: event.version,
      };
    }

    case "HouseholdValueUpdated":
      return {
        ...state,
        combinedValueCents: BigInt(event.payload.newValueCents),
        memberCount: event.payload.memberCount,
        version: event.version,
      };

    default:
      return state;
  }
}

export function hydrateHouseholdFromEvents(events: MeridianEvent[]): HouseholdState {
  return events.reduce(applyHouseholdEvent, createInitialHouseholdState());
}
