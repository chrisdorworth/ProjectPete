import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractTable, extractLinks, cleanText } from "../../framework/html-extractor.js";
import { extractEntities } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";
import { browserPool } from "../../framework/browser-pool.js";

/** Minimum estate value threshold in cents ($100,000). */
const ESTATE_VALUE_THRESHOLD_CENTS = BigInt(100_000_00);

interface ProbateRecord {
  caseNumber: string;
  decedentName: string;
  personalRepresentative: string | null;
  filingDate: string;
  filingType: string;
  estimatedValueCents: bigint | null;
  county: string;
  detailUrl: string | null;
}

interface CountyProbateConfig {
  county: string;
  searchUrl: string;
  baseUrl: string;
  tableSelector: string;
}

const FLORIDA_PROBATE_COUNTIES: CountyProbateConfig[] = [
  {
    county: "Orange",
    searchUrl: "https://myorangeclerk.realforeclose.com/index.cfm?zession=search&type=CP",
    baseUrl: "https://myorangeclerk.realforeclose.com",
    tableSelector: "table.search-results, table.results, #searchResults table",
  },
  {
    county: "Osceola",
    searchUrl: "https://courts.osceolaclerk.com/CaseSearch/search?caseType=PR",
    baseUrl: "https://courts.osceolaclerk.com",
    tableSelector: "table.case-results, table.searchResults, #results table",
  },
  {
    county: "Seminole",
    searchUrl: "https://www.seminoleclerk.org/online-services/court-records/search?type=PB",
    baseUrl: "https://www.seminoleclerk.org",
    tableSelector: "table.results, #searchResultsTable, table.case-list",
  },
  {
    county: "Brevard",
    searchUrl: "https://vmatrix1.brevardclerk.us/beca/CaseSearch.cfm?caseType=CP",
    baseUrl: "https://vmatrix1.brevardclerk.us",
    tableSelector: "table.caseResults, table#results, table.search-results",
  },
  {
    county: "Lake",
    searchUrl: "https://www.lakecountyclerk.org/court-records/search?type=PR",
    baseUrl: "https://www.lakecountyclerk.org",
    tableSelector: "table.results, table.case-search, #searchResults table",
  },
  {
    county: "Volusia",
    searchUrl: "https://www.clerk.org/public-records/court-records?caseType=PR",
    baseUrl: "https://www.clerk.org",
    tableSelector: "table.results, table.records, #caseResults table",
  },
];

export class ProbateCrawler extends BaseCrawler {
  private readonly counties: CountyProbateConfig[];

  constructor(counties?: CountyProbateConfig[]) {
    super({
      name: "probate",
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
    });
    this.counties = counties ?? FLORIDA_PROBATE_COUNTIES;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const countyConfig of this.counties) {
      try {
        const countySignals = await this.retryWithBackoff(() =>
          this.crawlCounty(countyConfig),
        );
        signals.push(...countySignals);
        await this.delay();
      } catch {
        // Individual county failure should not stop others
      }
    }

    return signals;
  }

  private async crawlCounty(config: CountyProbateConfig): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed(config.searchUrl, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url = `${config.searchUrl}&dateFrom=${startDate.toISOString().split("T")[0]}&dateTo=${now.toISOString().split("T")[0]}`;

    const page = await browserPool.acquirePage();
    const signals: ExtractedSignal[] = [];

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      const html = await page.content();

      const records = this.parseProbateResults(html, config);

      for (const record of records) {
        if (record.estimatedValueCents !== null && record.estimatedValueCents < ESTATE_VALUE_THRESHOLD_CENTS) {
          continue;
        }

        let nerText = `${record.decedentName} ${record.filingType} ${record.personalRepresentative ?? ""}`;

        if (record.detailUrl) {
          const detailAllowed = await isAllowed(record.detailUrl, this.config.userAgent);
          if (detailAllowed) {
            try {
              await page.goto(record.detailUrl, { waitUntil: "networkidle", timeout: 30_000 });
              nerText = cleanText(
                await page.evaluate(() => document.body?.innerText ?? ""),
              );
            } catch {
              // Detail page failure is not fatal
            }
          }
        }

        const nerResult = await extractEntities(nerText, `${config.county} County probate filing`);
        const signalType = this.resolveSignalType(record.filingType);

        signals.push({
          signalType,
          source: `${config.county} County Probate Court`,
          sourceUrl: record.detailUrl ?? config.searchUrl,
          sourceTier: 1,
          confidence: nerResult.confidence,
          rawData: {
            caseNumber: record.caseNumber,
            decedentName: record.decedentName,
            personalRepresentative: record.personalRepresentative,
            filingDate: record.filingDate,
            filingType: record.filingType,
            county: record.county,
          },
          extractedData: {
            name: record.decedentName,
            company: null,
            title: record.personalRepresentative ? "Personal Representative" : null,
            county: config.county,
            state: "FL",
            estimatedValueCents: record.estimatedValueCents !== null
              ? String(record.estimatedValueCents)
              : null,
            date: record.filingDate,
          },
          idempotencyKey: `probate-${config.county.toLowerCase()}-${record.caseNumber}`,
        });

        await this.delay();
      }
    } finally {
      await browserPool.releasePage(page);
    }

    return signals;
  }

  private parseProbateResults(html: string, config: CountyProbateConfig): ProbateRecord[] {
    const rows = extractTable(html, config.tableSelector);
    const links = extractLinks(html, "table a[href*='case'], table a[href*='Case']", config.baseUrl);

    return rows.map((row, index) => {
      const amountStr = row["estate_value"] ?? row["amount"] ?? row["value"] ?? null;
      let estimatedValueCents: bigint | null = null;

      if (amountStr) {
        const cleaned = amountStr.replace(/[^0-9.]/g, "");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          estimatedValueCents = BigInt(Math.round(parsed * 100));
        }
      }

      return {
        caseNumber: row["case_number"] ?? row["case_no"] ?? row["col_0"] ?? "",
        decedentName: row["decedent"] ?? row["name"] ?? row["party"] ?? row["col_1"] ?? "",
        personalRepresentative: row["personal_representative"] ?? row["pr"] ?? row["representative"] ?? null,
        filingDate: row["file_date"] ?? row["filing_date"] ?? row["col_2"] ?? "",
        filingType: row["filing_type"] ?? row["type"] ?? row["col_3"] ?? "probate",
        estimatedValueCents,
        county: config.county,
        detailUrl: links[index] ?? null,
      };
    });
  }

  private resolveSignalType(filingType: string): SignalType {
    const lower = filingType.toLowerCase();

    if (lower.includes("letters of administration") || lower.includes("pr appointment")) {
      return "probate_filing";
    }
    if (lower.includes("inheritance") || lower.includes("distribution")) {
      return "probate_filing";
    }

    return "probate_filing";
  }
}
