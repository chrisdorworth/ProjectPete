import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractTable, extractLinks, cleanText } from "../../framework/html-extractor.js";
import { extractEntities } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";
import { browserPool } from "../../framework/browser-pool.js";

interface DivorceRecord {
  caseNumber: string;
  petitioner: string;
  respondent: string | null;
  filingDate: string;
  filingType: string;
  county: string;
  detailUrl: string | null;
}

interface CountyDivorceConfig {
  county: string;
  searchUrl: string;
  baseUrl: string;
  tableSelector: string;
  caseTypeCode: string;
}

const FLORIDA_DIVORCE_COUNTIES: CountyDivorceConfig[] = [
  {
    county: "Orange",
    searchUrl: "https://myorangeclerk.realforeclose.com/index.cfm?zession=search&type=DR",
    baseUrl: "https://myorangeclerk.realforeclose.com",
    tableSelector: "table.search-results, table.results, #searchResults table",
    caseTypeCode: "DR",
  },
  {
    county: "Osceola",
    searchUrl: "https://courts.osceolaclerk.com/CaseSearch/search?caseType=FA",
    baseUrl: "https://courts.osceolaclerk.com",
    tableSelector: "table.case-results, table.searchResults, #results table",
    caseTypeCode: "FA",
  },
  {
    county: "Seminole",
    searchUrl: "https://www.seminoleclerk.org/online-services/court-records/search?type=FM",
    baseUrl: "https://www.seminoleclerk.org",
    tableSelector: "table.results, #searchResultsTable, table.case-list",
    caseTypeCode: "FM",
  },
  {
    county: "Brevard",
    searchUrl: "https://vmatrix1.brevardclerk.us/beca/CaseSearch.cfm?caseType=DR",
    baseUrl: "https://vmatrix1.brevardclerk.us",
    tableSelector: "table.caseResults, table#results, table.search-results",
    caseTypeCode: "DR",
  },
  {
    county: "Lake",
    searchUrl: "https://www.lakecountyclerk.org/court-records/search?type=DR",
    baseUrl: "https://www.lakecountyclerk.org",
    tableSelector: "table.results, table.case-search, #searchResults table",
    caseTypeCode: "DR",
  },
  {
    county: "Volusia",
    searchUrl: "https://www.clerk.org/public-records/court-records?caseType=DR",
    baseUrl: "https://www.clerk.org",
    tableSelector: "table.results, table.records, #caseResults table",
    caseTypeCode: "DR",
  },
];

export class DivorceCrawler extends BaseCrawler {
  private readonly counties: CountyDivorceConfig[];

  constructor(counties?: CountyDivorceConfig[]) {
    super({
      name: "divorce",
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
    });
    this.counties = counties ?? FLORIDA_DIVORCE_COUNTIES;
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

  private async crawlCounty(config: CountyDivorceConfig): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed(config.searchUrl, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url =
      `${config.searchUrl}` +
      `&dateFrom=${startDate.toISOString().split("T")[0]}` +
      `&dateTo=${now.toISOString().split("T")[0]}`;

    const page = await browserPool.acquirePage();
    const signals: ExtractedSignal[] = [];

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      const html = await page.content();

      const records = this.parseDivorceResults(html, config);

      for (const record of records) {
        if (!this.isDissolutionFiling(record)) continue;

        let nerText = `${record.petitioner} ${record.respondent ?? ""} ${record.filingType}`;

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

        const nerResult = await extractEntities(
          nerText,
          `${config.county} County dissolution of marriage filing`,
        );
        const primaryPerson = nerResult.persons[0] ?? null;

        signals.push({
          signalType: "divorce_filing" as SignalType,
          source: `${config.county} County Clerk of Court`,
          sourceUrl: record.detailUrl ?? config.searchUrl,
          sourceTier: 1,
          confidence: nerResult.confidence,
          rawData: {
            caseNumber: record.caseNumber,
            petitioner: record.petitioner,
            respondent: record.respondent,
            filingDate: record.filingDate,
            filingType: record.filingType,
            county: record.county,
          },
          extractedData: {
            name: primaryPerson?.name ?? record.petitioner,
            company: null,
            title: null,
            county: config.county,
            state: "FL",
            estimatedValueCents: nerResult.moneyAmounts[0]?.amount ?? null,
            date: record.filingDate,
          },
          idempotencyKey: `divorce-${config.county.toLowerCase()}-${record.caseNumber}`,
        });

        await this.delay();
      }
    } finally {
      await browserPool.releasePage(page);
    }

    return signals;
  }

  private parseDivorceResults(
    html: string,
    config: CountyDivorceConfig,
  ): DivorceRecord[] {
    const rows = extractTable(html, config.tableSelector);
    const links = extractLinks(
      html,
      "table a[href*='case'], table a[href*='Case']",
      config.baseUrl,
    );

    return rows.map((row, index) => ({
      caseNumber: row["case_number"] ?? row["case_no"] ?? row["col_0"] ?? "",
      petitioner: row["petitioner"] ?? row["plaintiff"] ?? row["party_1"] ?? row["col_1"] ?? "",
      respondent: row["respondent"] ?? row["defendant"] ?? row["party_2"] ?? row["col_2"] ?? null,
      filingDate: row["file_date"] ?? row["filing_date"] ?? row["col_3"] ?? "",
      filingType: row["filing_type"] ?? row["type"] ?? row["description"] ?? row["col_4"] ?? "",
      county: config.county,
      detailUrl: links[index] ?? null,
    }));
  }

  private isDissolutionFiling(record: DivorceRecord): boolean {
    const type = record.filingType.toLowerCase();
    return (
      type.includes("dissolution") ||
      type.includes("divorce") ||
      type.includes("dom") ||
      type.includes("family") ||
      type.includes("marriage")
    );
  }
}
