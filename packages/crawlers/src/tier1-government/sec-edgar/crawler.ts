import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractEntities } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";

const EFTS_BASE_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_FILING_URL = "https://www.sec.gov/cgi-bin/browse-edgar";
const EDGAR_FULL_TEXT_URL = "https://efts.sec.gov/LATEST/search-index";
const SEC_SEARCH_API = "https://efts.sec.gov/LATEST/search-index";
const SEC_FILING_API = "https://www.sec.gov/cgi-bin/browse-edgar";

type EdgarFormType = "D" | "13F-HR" | "3" | "4" | "5" | "8-K";

interface EdgarSearchResult {
  filingId: string;
  formType: string;
  companyName: string;
  cik: string;
  dateFiled: string;
  filingUrl: string;
  description: string;
}

interface EdgarFormDData {
  issuerName: string;
  totalOfferingAmount: string | null;
  totalAmountSold: string | null;
  isEquity: boolean;
  industryGroup: string | null;
  stateOfIncorporation: string | null;
  relatedPersons: Array<{ name: string; title: string }>;
}

const FORM_TYPE_TO_SIGNAL: Record<string, SignalType> = {
  D: "sec_form_d",
  "13F-HR": "sec_13f",
  "3": "sec_form4",
  "4": "sec_form4",
  "5": "sec_form4",
  "8-K": "sec_form_d",
};

/** Minimum delay between SEC requests (100ms = ~10 req/sec). */
const SEC_RATE_LIMIT_MS = 100;

export class SecEdgarCrawler extends BaseCrawler {
  private lastRequestAt = 0;
  private readonly formTypes: EdgarFormType[] = ["D", "13F-HR", "4", "3", "5", "8-K"];

  constructor() {
    super({
      name: "sec-edgar",
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 200,
      respectRobotsTxt: true,
      userAgent: "MeridianBot/1.0 (support@meridian.example.com)",
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed("https://efts.sec.gov/", this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const signals: ExtractedSignal[] = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateRange = `[${this.formatEdgarDate(startDate)} TO ${this.formatEdgarDate(now)}]`;

    for (const formType of this.formTypes) {
      try {
        const results = await this.retryWithBackoff(() =>
          this.searchFilings(formType, dateRange),
        );

        for (const result of results) {
          const signal = await this.processResult(result);
          if (signal) {
            signals.push(signal);
          }
          await this.rateLimitedDelay();
        }
      } catch {
        // Individual form type failure should not stop other types
      }
    }

    return signals;
  }

  private async searchFilings(
    formType: EdgarFormType,
    dateRange: string,
  ): Promise<EdgarSearchResult[]> {
    await this.rateLimitedDelay();

    const params = new URLSearchParams({
      q: `formType:"${formType}"`,
      dateRange: "custom",
      startdt: dateRange.split(" TO ")[0]!.replace("[", ""),
      enddt: dateRange.split(" TO ")[1]!.replace("]", ""),
      forms: formType,
    });

    const response = await fetch(
      `https://efts.sec.gov/LATEST/search-index?${params.toString()}`,
      {
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      throw new Error(`SEC EDGAR search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      hits?: {
        hits?: Array<{
          _id: string;
          _source: {
            form_type: string;
            entity_name: string;
            entity_id: string;
            file_date: string;
            file_description: string;
          };
        }>;
      };
    };

    const hits = data.hits?.hits ?? [];

    return hits.map((hit) => ({
      filingId: hit._id,
      formType: hit._source.form_type,
      companyName: hit._source.entity_name,
      cik: hit._source.entity_id,
      dateFiled: hit._source.file_date,
      filingUrl: `https://www.sec.gov/Archives/edgar/data/${hit._source.entity_id}/${hit._id}`,
      description: hit._source.file_description ?? "",
    }));
  }

  private async processResult(result: EdgarSearchResult): Promise<ExtractedSignal | null> {
    let filingText = "";

    try {
      await this.rateLimitedDelay();
      const response = await fetch(result.filingUrl, {
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) {
        filingText = await response.text();
      }
    } catch {
      // Filing detail fetch failure is not fatal
    }

    const textForNer = filingText
      ? filingText.slice(0, 5000)
      : `${result.formType} filing by ${result.companyName} on ${result.dateFiled}. ${result.description}`;

    const nerResult = await extractEntities(
      textForNer,
      `SEC ${result.formType} filing`,
    );

    const signalType = FORM_TYPE_TO_SIGNAL[result.formType] ?? "sec_form_d";
    const estimatedValueCents = this.extractFilingAmount(nerResult.moneyAmounts, filingText);
    const primaryPerson = nerResult.persons[0] ?? null;

    return {
      signalType,
      source: "SEC EDGAR",
      sourceUrl: result.filingUrl,
      sourceTier: 1,
      confidence: nerResult.confidence,
      rawData: {
        filingId: result.filingId,
        formType: result.formType,
        companyName: result.companyName,
        cik: result.cik,
        dateFiled: result.dateFiled,
        description: result.description,
      },
      extractedData: {
        name: primaryPerson?.name ?? null,
        company: result.companyName,
        title: primaryPerson?.title ?? null,
        county: null,
        state: nerResult.locations[0]?.state ?? null,
        estimatedValueCents: estimatedValueCents !== null ? String(estimatedValueCents) : null,
        date: result.dateFiled,
      },
      idempotencyKey: `sec-edgar-${result.formType}-${result.filingId}`,
    };
  }

  private extractFilingAmount(
    moneyAmounts: Array<{ amount: string; context: string }>,
    filingText: string,
  ): bigint | null {
    if (moneyAmounts.length > 0) {
      const cleaned = moneyAmounts[0]!.amount.replace(/[^0-9]/g, "");
      if (cleaned) {
        return BigInt(cleaned);
      }
    }

    const amountMatch = filingText.match(
      /(?:total\s+offering|aggregate|transaction)\s+amount[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    );
    if (amountMatch?.[1]) {
      const value = parseFloat(amountMatch[1].replace(/,/g, ""));
      if (!isNaN(value)) {
        return BigInt(Math.round(value * 100));
      }
    }

    return null;
  }

  private async rateLimitedDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < SEC_RATE_LIMIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, SEC_RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private formatEdgarDate(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }
}
