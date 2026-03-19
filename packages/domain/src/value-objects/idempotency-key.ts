import { createHash } from "node:crypto";

export class IdempotencyKey {
  private constructor(public readonly value: string) {}

  static fromParts(...parts: string[]): IdempotencyKey {
    const normalized = parts.map((p) => p.trim().toLowerCase()).join("|");
    const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 32);
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
