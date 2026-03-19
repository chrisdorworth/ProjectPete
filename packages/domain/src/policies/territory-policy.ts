export interface Territory {
  id: string;
  repId: string;
  name: string;
  zipCodes: string[];
  counties: string[];
  capacityCap: number;
  currentLoad: number;
  isActive: boolean;
}

export interface AssignmentResult {
  assigned: boolean;
  territoryId: string | null;
  repId: string | null;
  reason: string;
}

export function assignLeadToTerritory(
  leadZip: string | null,
  leadCounty: string | null,
  territories: Territory[],
): AssignmentResult {
  if (!leadZip && !leadCounty) {
    return {
      assigned: false,
      territoryId: null,
      repId: null,
      reason: "No ZIP or county on lead",
    };
  }

  const activeTerritories = territories.filter((t) => t.isActive);

  for (const territory of activeTerritories) {
    const zipMatch = leadZip ? territory.zipCodes.includes(leadZip) : false;
    const countyMatch = leadCounty
      ? territory.counties.some((c) => c.toLowerCase() === leadCounty.toLowerCase())
      : false;

    if (zipMatch || countyMatch) {
      if (territory.currentLoad >= territory.capacityCap) {
        continue;
      }

      return {
        assigned: true,
        territoryId: territory.id,
        repId: territory.repId,
        reason: zipMatch ? `ZIP ${leadZip} matches territory ${territory.name}` : `County ${leadCounty} matches territory ${territory.name}`,
      };
    }
  }

  return {
    assigned: false,
    territoryId: null,
    repId: null,
    reason: "No matching territory found",
  };
}

export function isAtCapacity(territory: Territory): boolean {
  return territory.currentLoad >= territory.capacityCap;
}

export function getRemainingCapacity(territory: Territory): number {
  return Math.max(0, territory.capacityCap - territory.currentLoad);
}
