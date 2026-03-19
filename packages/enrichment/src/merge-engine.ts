import { jaroWinkler, type DedupCandidate, checkDuplicate } from "@meridian/domain";

export interface GoldenRecord {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  emailConfidence: number;
  phone: string | null;
  cellPhone: string | null;
  homeAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  linkedinUrl: string | null;
  company: string | null;
  title: string | null;
  ageEstimate: number | null;
}

export interface MergeSource {
  provider: string;
  confidence: number;
  data: Partial<GoldenRecord>;
}

export function createGoldenRecord(sources: MergeSource[]): GoldenRecord {
  // Sort by confidence descending — higher confidence providers win ties
  const sorted = [...sources].sort((a, b) => b.confidence - a.confidence);

  const record: GoldenRecord = {
    firstName: null,
    lastName: null,
    fullName: null,
    email: null,
    emailConfidence: 0,
    phone: null,
    cellPhone: null,
    homeAddress: null,
    city: null,
    state: null,
    zipCode: null,
    linkedinUrl: null,
    company: null,
    title: null,
    ageEstimate: null,
  };

  for (const source of sorted) {
    for (const [key, value] of Object.entries(source.data)) {
      const current = (record as Record<string, unknown>)[key];
      if ((current === null || current === undefined) && value !== null && value !== undefined) {
        (record as Record<string, unknown>)[key] = value;
      }
    }
  }

  return record;
}

export function shouldMerge(a: DedupCandidate, b: DedupCandidate): boolean {
  const result = checkDuplicate(a, b);
  return result.isDuplicate;
}
