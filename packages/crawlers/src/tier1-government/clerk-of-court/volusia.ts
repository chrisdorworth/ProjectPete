import type { SignalType } from "@meridian/domain";
import {
  BaseClerkCrawler,
  type CaseRecord,
  type ClerkCaseType,
  type ClerkSearchParams,
} from "./_base-clerk.js";
import { extractTable, extractLinks } from "../../framework/html-extractor.js";

const VOLUSIA_BASE_URL = "https://www.clerk.org";

const CASE_TYPES: ClerkCaseType[] = ["civil", "probate", "family", "foreclosure"];

export class VolusiaClerkCrawler extends BaseClerkCrawler {
  constructor() {
    super("Volusia", CASE_TYPES, {
      requestDelayMs: 3500,
    });
  }

  protected getCountyUrl(): string {
    return VOLUSIA_BASE_URL;
  }

  protected getSearchUrl(params: ClerkSearchParams): string {
    const typeCode = this.getCaseTypeCode(params.caseType);
    return (
      `${VOLUSIA_BASE_URL}/public-records/court-records` +
      `?caseType=${typeCode}` +
      `&startDate=${params.startDate}` +
      `&endDate=${params.endDate}` +
      `&page=${params.page ?? 1}`
    );
  }

  protected parseSearchResults(html: string, baseUrl: string): CaseRecord[] {
    const rows = extractTable(html, "table.results, table.records, #caseResults table");
    const links = extractLinks(html, "table a[href*='case'], table a[href*='record']", baseUrl);

    return rows.map((row, index) => ({
      caseNumber: row["case_number"] ?? row["case_no"] ?? row["col_0"] ?? "",
      caseType: row["type"] ?? row["case_type"] ?? row["col_1"] ?? "",
      filingDate: row["file_date"] ?? row["filing_date"] ?? row["col_2"] ?? "",
      parties: this.extractParties(row),
      amount: row["amount"] ?? row["judgment"] ?? null,
      description: row["description"] ?? row["style"] ?? row["col_3"] ?? "",
      detailUrl: links[index] ?? null,
    }));
  }

  protected getCaseDetailUrl(caseNumber: string): string | null {
    if (!caseNumber) return null;
    return `${VOLUSIA_BASE_URL}/public-records/court-records/case/${encodeURIComponent(caseNumber)}`;
  }

  protected override resolveSignalType(caseType: ClerkCaseType, record: CaseRecord): SignalType {
    const desc = record.description.toLowerCase();

    if (caseType === "foreclosure" || desc.includes("foreclos")) return "deed_transfer";
    if (caseType === "probate" || desc.includes("probate")) return "probate_filing";
    if (caseType === "family" || desc.includes("dissolution")) return "divorce_filing";

    return "court_settlement";
  }

  private getCaseTypeCode(caseType: ClerkCaseType): string {
    switch (caseType) {
      case "civil": return "CI";
      case "probate": return "PR";
      case "family": return "DR";
      case "foreclosure": return "FC";
      default: return "CI";
    }
  }

  private extractParties(row: Record<string, string>): string[] {
    const parties: string[] = [];
    const plaintiff = row["plaintiff"] ?? row["petitioner"] ?? row["col_3"] ?? "";
    const defendant = row["defendant"] ?? row["respondent"] ?? row["col_4"] ?? "";

    if (plaintiff) parties.push(plaintiff);
    if (defendant) parties.push(defendant);

    if (parties.length === 0) {
      const style = row["style"] ?? row["case_style"] ?? "";
      if (style.includes(" vs ") || style.includes(" v. ")) {
        parties.push(...style.split(/\s+(?:vs\.?|v\.)\s+/i).map((p) => p.trim()));
      } else if (style) {
        parties.push(style);
      }
    }

    return parties.filter(Boolean);
  }
}
