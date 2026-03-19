import type { SignalType } from "@meridian/domain";
import {
  BaseClerkCrawler,
  type CaseRecord,
  type ClerkCaseType,
  type ClerkSearchParams,
} from "./_base-clerk.js";
import { extractTable, extractLinks } from "../../framework/html-extractor.js";

const SEMINOLE_BASE_URL = "https://www.seminoleclerk.org";

const CASE_TYPES: ClerkCaseType[] = ["civil", "probate", "family", "foreclosure"];

export class SeminoleClerkCrawler extends BaseClerkCrawler {
  constructor() {
    super("Seminole", CASE_TYPES, {
      requestDelayMs: 3500,
    });
  }

  protected getCountyUrl(): string {
    return SEMINOLE_BASE_URL;
  }

  protected getSearchUrl(params: ClerkSearchParams): string {
    const typeCode = this.getCaseTypeCode(params.caseType);
    return (
      `${SEMINOLE_BASE_URL}/online-services/court-records/search` +
      `?type=${typeCode}` +
      `&from=${params.startDate}` +
      `&to=${params.endDate}` +
      `&pg=${params.page ?? 1}`
    );
  }

  protected parseSearchResults(html: string, baseUrl: string): CaseRecord[] {
    const rows = extractTable(html, "table.results, #searchResultsTable, table.case-list");
    const links = extractLinks(html, "table a[href*='case'], table a[href*='record']", baseUrl);

    return rows.map((row, index) => ({
      caseNumber: row["case_number"] ?? row["case_no"] ?? row["col_0"] ?? "",
      caseType: row["type"] ?? row["case_type"] ?? row["col_1"] ?? "",
      filingDate: row["file_date"] ?? row["filed"] ?? row["col_2"] ?? "",
      parties: this.extractParties(row),
      amount: row["amount"] ?? row["judgment_amount"] ?? null,
      description: row["description"] ?? row["style"] ?? row["col_3"] ?? "",
      detailUrl: links[index] ?? null,
    }));
  }

  protected getCaseDetailUrl(caseNumber: string): string | null {
    if (!caseNumber) return null;
    return `${SEMINOLE_BASE_URL}/online-services/court-records/case/${encodeURIComponent(caseNumber)}`;
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
      case "civil": return "CV";
      case "probate": return "PB";
      case "family": return "FM";
      case "foreclosure": return "FC";
      default: return "CV";
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
