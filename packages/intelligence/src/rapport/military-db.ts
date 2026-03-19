export interface MilitaryBranchInfo {
  branch: string;
  abbreviation: string;
  greeting: string;
  conventions: string[];
  openers: string[];
}

const BRANCHES: Record<string, MilitaryBranchInfo> = {
  army: {
    branch: "United States Army",
    abbreviation: "USA",
    greeting: "Thank you for your service",
    conventions: ["Hooah", "Use rank when known", "Army Strong"],
    openers: [
      "Thank you for your service to our country.",
      "I have tremendous respect for Army veterans.",
      "What was your MOS?",
    ],
  },
  navy: {
    branch: "United States Navy",
    abbreviation: "USN",
    greeting: "Thank you for your service",
    conventions: ["Hooyah", "Ship references", "Anchors Aweigh"],
    openers: [
      "Thank you for your service.",
      "Navy — were you surface, sub, or air?",
      "Fair winds and following seas to a fellow patriot.",
    ],
  },
  "air force": {
    branch: "United States Air Force",
    abbreviation: "USAF",
    greeting: "Thank you for your service",
    conventions: ["Aim High", "Use rank when known"],
    openers: [
      "Thank you for your service.",
      "Air Force — what was your AFSC?",
      "Aim High — love that motto.",
    ],
  },
  marines: {
    branch: "United States Marine Corps",
    abbreviation: "USMC",
    greeting: "Semper Fi",
    conventions: ["Semper Fidelis", "Once a Marine, always a Marine", "Oorah"],
    openers: [
      "Semper Fi — thank you for your service.",
      "Once a Marine, always a Marine.",
      "The Few, The Proud — tremendous respect.",
    ],
  },
  "coast guard": {
    branch: "United States Coast Guard",
    abbreviation: "USCG",
    greeting: "Thank you for your service",
    conventions: ["Semper Paratus", "Always Ready"],
    openers: [
      "Thank you for your service.",
      "Semper Paratus — always ready.",
      "Coast Guard — protecting our waters.",
    ],
  },
  "space force": {
    branch: "United States Space Force",
    abbreviation: "USSF",
    greeting: "Thank you for your service",
    conventions: ["Semper Supra", "Always Above"],
    openers: [
      "Thank you for your service.",
      "Space Force — the newest branch. Fascinating work.",
    ],
  },
};

export function lookupBranch(branch: string): MilitaryBranchInfo | null {
  const normalized = branch.toLowerCase().trim()
    .replace(/^us\s*/, "")
    .replace(/^united states\s*/, "")
    .replace(/\bmarines?\b/, "marines")
    .replace(/\bcorps\b/, "");
  return BRANCHES[normalized.trim()] ?? null;
}

export function getGreeting(branch: string): string {
  const info = lookupBranch(branch);
  return info?.greeting ?? "Thank you for your service";
}

export function getOpeners(branch: string): string[] {
  const info = lookupBranch(branch);
  return info?.openers ?? ["Thank you for your service."];
}
