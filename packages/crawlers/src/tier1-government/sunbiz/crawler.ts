import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractTable, extractLinks, extractText, cleanText } from "../../framework/html-extractor.js";
import { extractEntities } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";
import { browserPool } from "../../framework/browser-pool.js";

const SUNBIZ_BASE_URL = "https://search.sunbiz.org";
const SUNBIZ_DETAIL_URL = "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchByName";

type SunbizEntityType = "llc" | "corp" | "lp" | "all";

interface SunbizRecord {
  documentNumber: string;
  entityName: string;
  entityType: string;
  filingDate: string;
  status: string;
  registeredAgent: string | null;
  principalAddress: string | null;
  state: string;
  detailUrl: string | null;
}

type SunbizSearchType = "new_registration" | "annual_filing" | "dissolution";

const SEARCH_CONFIGS: Array<{
  type: SunbizSearchType;
  urlPath: string;
  signalType: SignalType;
}> = [
  {
    type: "new_registration",
    urlPath: "/Inquiry/CorporationSearch/SearchByName",
    signalType: "business_dissolution", // Will be overridden to registration
  },
  {
    type: "dissolution",
    urlPath: "/Inquiry/CorporationSearch/SearchByName",
    signalType: "business_dissolution",
  },
];

export class SunbizCrawler extends BaseCrawler {
  constructor() {
    super({
      name: "sunbiz",
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed(SUNBIZ_BASE_URL, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const signals: ExtractedSignal[] = [];

    try {
      const newRegistrations = await this.retryWithBackoff(() =>
        this.crawlNewRegistrations(),
      );
      signals.push(...newRegistrations);
    } catch {
      // New registration crawl failure is not fatal
    }

    await this.delay();

    try {
      const dissolutions = await this.retryWithBackoff(() =>
        this.crawlDissolutions(),
      );
      signals.push(...dissolutions);
    } catch {
      // Dissolution crawl failure is not fatal
    }

    await this.delay();

    try {
      const annualFilings = await this.retryWithBackoff(() =>
        this.crawlAnnualFilings(),
      );
      signals.push(...annualFilings);
    } catch {
      // Annual filing crawl failure is not fatal
    }

    return signals;
  }

  private async crawlNewRegistrations(): Promise<ExtractedSignal[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url =
      `${SUNBIZ_BASE_URL}/Inquiry/CorporationSearch/SearchByDateFiled` +
      `?filingDateFrom=${this.formatDate(startDate)}` +
      `&filingDateTo=${this.formatDate(now)}` +
      `&entityType=all`;

    return this.fetchAndParse(url, "business_dissolution");
  }

  private async crawlDissolutions(): Promise<ExtractedSignal[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url =
      `${SUNBIZ_BASE_URL}/Inquiry/CorporationSearch/SearchByDateDissolved` +
      `?dissolutionDateFrom=${this.formatDate(startDate)}` +
      `&dissolutionDateTo=${this.formatDate(now)}` +
      `&entityType=all`;

    return this.fetchAndParse(url, "business_dissolution");
  }

  private async crawlAnnualFilings(): Promise<ExtractedSignal[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url =
      `${SUNBIZ_BASE_URL}/Inquiry/CorporationSearch/SearchByDateFiled` +
      `?filingDateFrom=${this.formatDate(startDate)}` +
      `&filingDateTo=${this.formatDate(now)}` +
      `&filingType=annual`;

    return this.fetchAndParse(url, "business_dissolution");
  }

  private async fetchAndParse(
    url: string,
    defaultSignalType: SignalType,
  ): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed(url, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const page = await browserPool.acquirePage();
    const signals: ExtractedSignal[] = [];

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      const html = await page.content();

      const records = this.parseResults(html);

      for (const record of records) {
        const signal = await this.processRecord(record, page);
        if (signal) {
          signals.push(signal);
        }
        await this.delay();
      }
    } finally {
      await browserPool.releasePage(page);
    }

    return signals;
  }

  private parseResults(html: string): SunbizRecord[] {
    const rows = extractTable(
      html,
      "table.search-results, table#searchResultsTable, table.results",
    );
    const links = extractLinks(
      html,
      "table a[href*='corporation'], table a[href*='Document']",
      SUNBIZ_BASE_URL,
    );

    return rows.map((row, index) => ({
      documentNumber: row["document_number"] ?? row["doc_number"] ?? row["col_0"] ?? "",
      entityName: row["entity_name"] ?? row["name"] ?? row["col_1"] ?? "",
      entityType: row["entity_type"] ?? row["type"] ?? row["col_2"] ?? "",
      filingDate: row["filing_date"] ?? row["date_filed"] ?? row["col_3"] ?? "",
      status: row["status"] ?? row["col_4"] ?? "",
      registeredAgent: row["registered_agent"] ?? row["agent"] ?? null,
      principalAddress: row["principal_address"] ?? row["address"] ?? null,
      state: "FL",
      detailUrl: links[index] ?? null,
    }));
  }

  private async processRecord(
    record: SunbizRecord,
    page: import("playwright").Page,
  ): Promise<ExtractedSignal | null> {
    let nerText = `${record.entityName} ${record.entityType} ${record.status} ${record.registeredAgent ?? ""}`;

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

    const nerResult = await extractEntities(nerText, "Florida Sunbiz business filing");
    const signalType = this.resolveSignalType(record);
    const primaryPerson = nerResult.persons[0] ?? null;

    return {
      signalType,
      source: "Florida Division of Corporations (Sunbiz)",
      sourceUrl: record.detailUrl ?? SUNBIZ_BASE_URL,
      sourceTier: 1,
      confidence: nerResult.confidence,
      rawData: {
        documentNumber: record.documentNumber,
        entityName: record.entityName,
        entityType: record.entityType,
        filingDate: record.filingDate,
        status: record.status,
        registeredAgent: record.registeredAgent,
        principalAddress: record.principalAddress,
      },
      extractedData: {
        name: primaryPerson?.name ?? record.registeredAgent ?? null,
        company: record.entityName,
        title: primaryPerson?.title ?? "Registered Agent",
        county: nerResult.locations[0]?.county ?? null,
        state: "FL",
        estimatedValueCents: nerResult.moneyAmounts[0]?.amount ?? null,
        date: record.filingDate,
      },
      idempotencyKey: `sunbiz-${record.documentNumber}`,
    };
  }

  private resolveSignalType(record: SunbizRecord): SignalType {
    const status = record.status.toLowerCase();
    const entityType = record.entityType.toLowerCase();

    if (status.includes("dissolv") || status.includes("inactive") || status.includes("withdrawn")) {
      return "business_dissolution";
    }
    if (status.includes("merg")) {
      return "business_merger";
    }

    return "business_dissolution";
  }

  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}
