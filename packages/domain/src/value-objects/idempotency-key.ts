/**
 * FNV-1a hash — pure JS, no node:crypto dependency.
 * Returns a 32-char hex string (128-bit via two 64-bit halves).
 */
function fnv1aHash(input: string): string {
  // FNV-1a 32-bit
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  let h3 = 0x811c9dc5;
  let h4 = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ ((c + 1) & 0xff), 0x01000193);
    h3 = Math.imul(h3 ^ ((c + 2) & 0xff), 0x01000193);
    h4 = Math.imul(h4 ^ ((c + 3) & 0xff), 0x01000193);
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h3 >>> 0).toString(16).padStart(8, "0") +
    (h4 >>> 0).toString(16).padStart(8, "0")
  );
}

export class IdempotencyKey {
  private constructor(public readonly value: string) {}

  static fromParts(...parts: string[]): IdempotencyKey {
    const normalized = parts.map((p) => p.trim().toLowerCase()).join("|");
    const hash = fnv1aHash(normalized);
    return new IdempotencyKey(hash);
  }

  static forDeedTransfer(county: string, bookPage: string, date: string): IdempotencyKey {
    return IdempotencyKey.fromParts("deed", county, bookPage, date);
  }

  static forSecFiling(cik: string, formType: string, filingDate: string): IdempotencyKey {
    return IdempotencyKey.fromParts("sec", cik, formType, filingDate);
  }

  static forProbate(county: string, caseNumber: string): IdempotencyKey {
    return IdempotencyKey.fromParts("probate", county, caseNumber);
  }

  static forBusinessFiling(entityId: string, filingType: string, date: string): IdempotencyKey {
    return IdempotencyKey.fromParts("sunbiz", entityId, filingType, date);
  }

  static forNews(url: string): IdempotencyKey {
    return IdempotencyKey.fromParts("news", url);
  }

  static forLinkedIn(profileUrl: string, eventType: string, date: string): IdempotencyKey {
    return IdempotencyKey.fromParts("linkedin", profileUrl, eventType, date);
  }

  static forLicense(boardId: string, licenseNumber: string, action: string): IdempotencyKey {
    return IdempotencyKey.fromParts("license", boardId, licenseNumber, action);
  }

  static forPatent(patentNumber: string, assignmentDate: string): IdempotencyKey {
    return IdempotencyKey.fromParts("patent", patentNumber, assignmentDate);
  }

  static forIntent(companyDomain: string, topic: string, weekOf: string): IdempotencyKey {
    return IdempotencyKey.fromParts("intent", companyDomain, topic, weekOf);
  }

  equals(other: IdempotencyKey): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
