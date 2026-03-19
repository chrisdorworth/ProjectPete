/**
 * Household Policy: Same address OR Whitepages relatives OR shared property → household
 * Pure function — no I/O (RULE-16).
 */

import { normalizeAddress } from "./normalize-address.js";

export interface HouseholdCandidate {
  leadId: string;
  fullName: string | null;
  lastName: string | null;
  homeAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  relatives: string[];
  coOwnershipProperties: string[];
}

export interface HouseholdMatchResult {
  shouldFormHousehold: boolean;
  matchReason: "shared_address" | "whitepages_relatives" | "co_ownership" | null;
  confidence: number;
}

export function checkHouseholdMatch(
  a: HouseholdCandidate,
  b: HouseholdCandidate,
): HouseholdMatchResult {
  if (a.leadId === b.leadId) {
    return { shouldFormHousehold: false, matchReason: null, confidence: 0 };
  }

  if (hasSharedAddress(a, b)) {
    return { shouldFormHousehold: true, matchReason: "shared_address", confidence: 0.9 };
  }

  if (hasRelativeMatch(a, b)) {
    return { shouldFormHousehold: true, matchReason: "whitepages_relatives", confidence: 0.85 };
  }

  if (hasCoOwnership(a, b)) {
    return { shouldFormHousehold: true, matchReason: "co_ownership", confidence: 0.8 };
  }

  return { shouldFormHousehold: false, matchReason: null, confidence: 0 };
}

function hasSharedAddress(a: HouseholdCandidate, b: HouseholdCandidate): boolean {
  if (!a.homeAddress || !b.homeAddress) return false;
  if (!a.zipCode || !b.zipCode) return false;

  const addrA = normalizeAddress(a.homeAddress);
  const addrB = normalizeAddress(b.homeAddress);
  const zipMatch = a.zipCode === b.zipCode;

  return zipMatch && addrA === addrB;
}

function hasRelativeMatch(a: HouseholdCandidate, b: HouseholdCandidate): boolean {
  const nameB = (b.fullName ?? b.lastName ?? "").toLowerCase().trim();
  if (!nameB) return false;

  for (const relative of a.relatives) {
    if (relative.toLowerCase().includes(nameB) || nameB.includes(relative.toLowerCase())) {
      return true;
    }
  }

  const nameA = (a.fullName ?? a.lastName ?? "").toLowerCase().trim();
  if (!nameA) return false;

  for (const relative of b.relatives) {
    if (relative.toLowerCase().includes(nameA) || nameA.includes(relative.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function hasCoOwnership(a: HouseholdCandidate, b: HouseholdCandidate): boolean {
  if (a.coOwnershipProperties.length === 0 || b.coOwnershipProperties.length === 0) return false;

  const setA = new Set(a.coOwnershipProperties.map((p) => p.toLowerCase()));
  return b.coOwnershipProperties.some((p) => setA.has(p.toLowerCase()));
}

export function calculateHouseholdValue(
  memberValues: bigint[],
): bigint {
  return memberValues.reduce((sum, v) => sum + v, 0n);
}

export function getHighestScore(memberScores: number[]): number {
  return memberScores.length > 0 ? Math.max(...memberScores) : 0;
}
