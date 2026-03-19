import type { SignalType } from "@meridian/domain";
import {
  BaseClerkCrawler,
  type CaseRecord,
  type ClerkCaseType,
  type ClerkSearchParams,
} from "./_base-clerk.js";
import { extractTable, extractLinks, extractText } from "../../framework/html-extractor.js";

const ORANGE_BASE_URL = "https://myorangeclerk.realforeclose.com";

const CASE_TYPES: ClerkCaseType[] = ["civil", "probate", "family", "foreclosure"];

export class OrangeClerkCrawler extends BaseClerkCrawler {
  constructor() {
    super("Orange", CASE_TYPES, {
      requestDelayMs: 4000,
    });
  }

  protected getCountyUrl(): string {
    return ORANGE_BASE_URL;
  }

  protected getSearchUrl(params: ClerkSearchParams): string {
    const typeCode = this.getCaseTypeCode(params.caseType);
    return (
      `${ORANGE_BASE_URL}/index.cfm?zession=search` +
      `&type=${typeCode}` +
      `&datefrom=${params.startDate}` +
      `&dateto=${params.endDate}` +
      `&page=${params.page ?? 1}`
    );
  }

  protected parseSearchResults(html: string, baseUrl: string): CaseRecord[] {
    const rows = extractTable(html, "table.search-results, table.results, #searchResults table");
    const links = extractLinks(html, "table a[href*='case']", baseUrl);

    return rows.map((row, index) => ({
      caseNumber: row["case_number"] ?? row["case_#"] ?? row["case"] ?? row["col_0"] ?? "",
      caseType: row["type"] ?? row["case_type"] ?? row["col_1"] ?? "",
      filingDate: row["file_date"] ?? row["filing_date"] ?? row["date_filed"] ?? row["col_2"] ?? "",
      parties: this.extractParties(row),
      amount: row["amount"] ?? row["judgment_amount"] ?? row["col_5"] ?? null,
      description: row["description"] ?? row["style"] ?? row["col_3"] ?? "",
      detailUrl: links[index] ?? null,
    }));
  }

  protected getCaseDetailUrl(caseNumber: string): string | null {
    if (!caseNumber) return null;
    return `${ORANGE_BASE_URL}/index.cfm?zession=case&caession=${encodeURIComponent(caseNumber)}`;
  }

  protected override resolveSignalType(caseType: ClerkCaseType, record: CaseRecord): SignalType {
    const desc = record.description.toLowerCase();

    if (caseType === "foreclosure" || desc.includes("foreclos")) {
      return "deed_transfer";
    }
    if (caseType === "probate" || desc.includes("probate") || desc.includes("estate")) {
      return "probate_filing";
    }
    if (
      caseType === "family" ||
      desc.includes("dissolution") ||
      desc.includes("divorce")
    ) {
      return "divorce_filing";
    }
    if (desc.includes("real estate") || desc.includes("deed")) {
      return "deed_transfer";
    }

    return "court_settlement";
  }

  private getCaseTypeCode(caseType: ClerkCaseType): string {
    switch (caseType) {
      case "civil":
        return "CA";
      case "probate":
        return "CP";
      case "family":
        return "DR";
      case "foreclosure":
        return "CF";
      default:
        return "CA";
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
