/**
 * Dedup Policy: Jaro-Winkler >= 0.88 + same county → merge
 * Pure function — no I/O dependencies (RULE-16).
 */

export interface DedupCandidate {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  county: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface DedupResult {
  isDuplicate: boolean;
  matchScore: number;
  matchReasons: string[];
  survivorId: string | null;
}

export function checkDuplicate(
  incoming: DedupCandidate,
  existing: DedupCandidate,
): DedupResult {
  const reasons: string[] = [];
  let score = 0;

  if (incoming.email && existing.email && normalizeEmail(incoming.email) === normalizeEmail(existing.email)) {
    score += 0.5;
    reasons.push("exact_email_match");
  }

  if (incoming.phone && existing.phone && normalizePhone(incoming.phone) === normalizePhone(existing.phone)) {
    score += 0.3;
    reasons.push("exact_phone_match");
  }

  const nameA = (incoming.fullName ?? `${incoming.firstName ?? ""} ${incoming.lastName ?? ""}`).trim();
  const nameB = (existing.fullName ?? `${existing.firstName ?? ""} ${existing.lastName ?? ""}`).trim();

  if (nameA && nameB) {
    const nameSimilarity = jaroWinkler(nameA.toLowerCase(), nameB.toLowerCase());
    if (nameSimilarity >= 0.88) {
      score += 0.4 * nameSimilarity;
      reasons.push(`name_similarity_${nameSimilarity.toFixed(2)}`);
    }
  }

  const sameCounty = incoming.county && existing.county &&
    incoming.county.toLowerCase() === existing.county.toLowerCase();
  if (sameCounty) {
    score += 0.1;
    reasons.push("same_county");
  }

  if (incoming.address && existing.address) {
    const addrSimilarity = jaroWinkler(
      normalizeAddress(incoming.address),
      normalizeAddress(existing.address),
    );
    if (addrSimilarity >= 0.9) {
      score += 0.2;
      reasons.push("address_match");
    }
  }

  const isDuplicate = score >= 0.6;

  return {
    isDuplicate,
    matchScore: Math.min(1, score),
    matchReasons: reasons,
    survivorId: isDuplicate ? existing.id : null,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\broad\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bapartment\b/g, "apt")
    .replace(/\bsuite\b/g, "ste")
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Jaro-Winkler similarity algorithm.
 * Returns value between 0 (no match) and 1 (exact match).
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
