import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type CrawlerConfig,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractTable, extractLinks, cleanText } from "../../framework/html-extractor.js";
import { extractEntities, type NERResult } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";
import { browserPool } from "../../framework/browser-pool.js";
import type { Page } from "playwright";

export interface CaseRecord {
  caseNumber: string;
  caseType: string;
  filingDate: string;
  parties: string[];
  amount: string | null;
  description: string;
  detailUrl: string | null;
}

export type ClerkCaseType = "civil" | "probate" | "family" | "foreclosure";

export interface ClerkSearchParams {
  caseType: ClerkCaseType;
  startDate: string;
  endDate: string;
  page?: number;
}

const SIGNAL_TYPE_MAP: Record<string, SignalType> = {
  foreclosure: "deed_transfer",
  probate: "probate_filing",
  family: "divorce_filing",
  civil: "court_settlement",
};

export abstract class BaseClerkCrawler extends BaseCrawler {
  protected readonly county: string;
  protected readonly state = "FL";
  protected readonly caseTypes: ClerkCaseType[];

  constructor(
    county: string,
    caseTypes: ClerkCaseType[],
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: `clerk-of-court-${county.toLowerCase()}`,
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
      ...configOverrides,
    });
    this.county = county;
    this.caseTypes = caseTypes;
  }

  protected abstract getCountyUrl(): string;

  protected abstract getSearchUrl(params: ClerkSearchParams): string;

  protected abstract parseSearchResults(html: string, baseUrl: string): CaseRecord[];

  protected abstract getCaseDetailUrl(caseNumber: string): string | null;

  protected async crawl(): Promise<ExtractedSignal[]> {
    const baseUrl = this.getCountyUrl();

    const allowed = await isAllowed(baseUrl, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const signals: ExtractedSignal[] = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endDateStr = now.toISOString().split("T")[0]!;
    const startDateStr = startDate.toISOString().split("T")[0]!;

    for (const caseType of this.caseTypes) {
      try {
        const caseSignals = await this.retryWithBackoff(() =>
          this.searchCaseType({
            caseType,
            startDate: startDateStr,
            endDate: endDateStr,
          }),
        );
        signals.push(...caseSignals);
        await this.delay();
      } catch {
        // Individual case type failure should not stop other types
      }
    }

    return signals;
  }

  private async searchCaseType(params: ClerkSearchParams): Promise<ExtractedSignal[]> {
    const searchUrl = this.getSearchUrl(params);

    const allowed = await isAllowed(searchUrl, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const page = await browserPool.acquirePage();
    const signals: ExtractedSignal[] = [];

    try {
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30_000 });
      const html = await page.content();
      const records = this.parseSearchResults(html, searchUrl);

      for (const record of records) {
        const signal = await this.processCaseRecord(record, params.caseType, page);
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

  private async processCaseRecord(
    record: CaseRecord,
    caseType: ClerkCaseType,
    page: Page,
  ): Promise<ExtractedSignal | null> {
    let nerResult: NERResult | null = null;

    if (record.detailUrl) {
      const allowed = await isAllowed(record.detailUrl, this.config.userAgent);
      if (allowed) {
        try {
          await page.goto(record.detailUrl, { waitUntil: "networkidle", timeout: 30_000 });
          const detailHtml = await page.content();
          const detailText = cleanText(
            await page.evaluate(() => document.body?.innerText ?? ""),
          );
          nerResult = await extractEntities(detailText, `${this.county} County ${caseType} case`);
        } catch {
          // Detail page failure is not fatal
        }
      }
    }

    if (!nerResult) {
      const summaryText = [
        record.caseNumber,
        record.caseType,
        record.description,
        ...record.parties,
        record.amount ?? "",
      ].join(" ");
      nerResult = await extractEntities(summaryText, `${this.county} County ${caseType} case`);
    }

    const signalType = this.resolveSignalType(caseType, record);
    const estimatedValueCents = this.parseAmountToCents(record.amount);
    const primaryPerson = nerResult.persons[0] ?? null;
    const primaryOrg = nerResult.organizations[0] ?? null;
    const location = nerResult.locations[0] ?? null;

    return {
      signalType,
      source: `${this.county} County Clerk of Court`,
      sourceUrl: record.detailUrl ?? this.getCountyUrl(),
      sourceTier: 1,
      confidence: nerResult.confidence,
      rawData: {
        caseNumber: record.caseNumber,
        caseType: record.caseType,
        filingDate: record.filingDate,
        parties: record.parties,
        amount: record.amount,
        description: record.description,
      },
      extractedData: {
        name: primaryPerson?.name ?? record.parties[0] ?? null,
        company: primaryOrg?.name ?? primaryPerson?.company ?? null,
        title: primaryPerson?.title ?? null,
        county: location?.county ?? this.county,
        state: location?.state ?? this.state,
        estimatedValueCents: estimatedValueCents !== null ? String(estimatedValueCents) : null,
        date: record.filingDate ?? null,
      },
      idempotencyKey: `clerk-${this.county.toLowerCase()}-${record.caseNumber}`,
    };
  }

  protected resolveSignalType(caseType: ClerkCaseType, _record: CaseRecord): SignalType {
    return SIGNAL_TYPE_MAP[caseType] ?? "court_settlement";
  }

  protected parseAmountToCents(amount: string | null): bigint | null {
    if (!amount) return null;

    const cleaned = amount.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;

    return BigInt(Math.round(parsed * 100));
  }

  protected buildIdempotencyKey(caseNumber: string): string {
    return `clerk-${this.county.toLowerCase()}-${caseNumber}`;
  }
}
