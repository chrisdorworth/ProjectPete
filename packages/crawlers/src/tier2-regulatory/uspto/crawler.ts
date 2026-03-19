import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface PatentRecord {
  patentNumber: string;
  title: string;
  inventorNames: string[];
  assigneeName: string | null;
  assigneeState: string | null;
  grantDate: string;
  applicationDate: string;
  patentKind: string;
  uspcClasses: string[];
}

interface TrademarkRecord {
  serialNumber: string;
  registrationNumber: string | null;
  markLiteral: string;
  ownerName: string;
  ownerState: string | null;
  filingDate: string;
  registrationDate: string | null;
  statusCode: string;
  goodsAndServices: string;
}

const FL_STATE_CODES = ["FL"];

const USPTO_PATENT_API = "https://developer.uspto.gov/ibd-api/v1/patent/application";
const USPTO_TRADEMARK_API = "https://tsdrapi.uspto.gov/ts/cd/casestatus/sn";
const USPTO_BULK_SEARCH = "https://developer.uspto.gov/ibd-api/v1/patent/grant";

export class UsptoCrawler extends BaseCrawler {
  private readonly apiKey: string | null;

  constructor(
    apiKey: string | null = null,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "uspto-patent-trademark",
      tier: 2,
      maxConcurrentPages: 2,
      requestDelayMs: 2000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
    this.apiKey = apiKey;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    const [patents, trademarks] = await Promise.all([
      this.fetchRecentPatents(),
      this.fetchRecentTrademarks(),
    ]);

    for (const patent of patents) {
      if (this.isFloridaAssignee(patent.assigneeState)) {
        signals.push(this.toPatentSignal(patent));
      }
    }

    for (const tm of trademarks) {
      if (this.isFloridaAssignee(tm.ownerState)) {
        signals.push(this.toTrademarkSignal(tm));
      }
    }

    return signals;
  }

  private async fetchRecentPatents(): Promise<PatentRecord[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const today = new Date();

    return this.retryWithBackoff(async () => {
      const url = new URL(USPTO_BULK_SEARCH);
      url.searchParams.set("grantFromDate", sevenDaysAgo.toISOString().slice(0, 10));
      url.searchParams.set("grantToDate", today.toISOString().slice(0, 10));
      url.searchParams.set("assigneeState", "FL");
      url.searchParams.set("rows", "200");
      url.searchParams.set("start", "0");

      const headers: Record<string, string> = {
        "User-Agent": this.config.userAgent,
        Accept: "application/json",
      };
      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
      }

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`USPTO patent fetch failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        response: { docs: Record<string, unknown>[] };
      };

      return (data.response?.docs ?? []).map((doc) => ({
        patentNumber: String(doc.patentNumber ?? ""),
        title: String(doc.inventionTitle ?? ""),
        inventorNames: Array.isArray(doc.inventorName)
          ? (doc.inventorName as string[])
          : [String(doc.inventorName ?? "")],
        assigneeName: doc.assigneeName ? String(doc.assigneeName) : null,
        assigneeState: doc.assigneeState ? String(doc.assigneeState) : null,
        grantDate: String(doc.grantDate ?? ""),
        applicationDate: String(doc.applicationDate ?? ""),
        patentKind: String(doc.patentKind ?? ""),
        uspcClasses: Array.isArray(doc.uspcFullClassification)
          ? (doc.uspcFullClassification as string[])
          : [],
      }));
    });
  }

  private async fetchRecentTrademarks(): Promise<TrademarkRecord[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    return this.retryWithBackoff(async () => {
      const url = new URL("https://tsdrapi.uspto.gov/ts/cd/casestatus/search");
      const headers: Record<string, string> = {
        "User-Agent": this.config.userAgent,
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (this.apiKey) {
        headers["X-Api-Key"] = this.apiKey;
      }

      const res = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          ownerState: "FL",
          statusDate: sevenDaysAgo.toISOString().slice(0, 10),
          rows: 200,
        }),
      });

      if (!res.ok) {
        throw new Error(`USPTO trademark fetch failed: ${res.status}`);
      }

      const data = (await res.json()) as { results: Record<string, unknown>[] };
      return (data.results ?? []).map((r) => ({
        serialNumber: String(r.serialNumber ?? ""),
        registrationNumber: r.registrationNumber ? String(r.registrationNumber) : null,
        markLiteral: String(r.markLiteral ?? r.wordMark ?? ""),
        ownerName: String(r.ownerName ?? ""),
        ownerState: r.ownerState ? String(r.ownerState) : null,
        filingDate: String(r.filingDate ?? ""),
        registrationDate: r.registrationDate ? String(r.registrationDate) : null,
        statusCode: String(r.statusCode ?? ""),
        goodsAndServices: String(r.goodsAndServices ?? ""),
      }));
    });
  }

  private isFloridaAssignee(state: string | null): boolean {
    return state !== null && FL_STATE_CODES.includes(state.toUpperCase());
  }

  private toPatentSignal(patent: PatentRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.PATENT_ASSIGNMENT satisfies SignalType,
      source: "uspto-patents",
      sourceUrl: `https://patents.google.com/patent/US${patent.patentNumber}`,
      sourceTier: 2,
      confidence: 0.8,
      rawData: { ...patent },
      extractedData: {
        name: patent.inventorNames[0] ?? null,
        company: patent.assigneeName,
        title: patent.title,
        county: null,
        state: patent.assigneeState ?? "FL",
        estimatedValueCents: null,
        date: patent.grantDate,
      },
      idempotencyKey: `patent-${patent.patentNumber}`,
    };
  }

  private toTrademarkSignal(tm: TrademarkRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.PATENT_ASSIGNMENT satisfies SignalType,
      source: "uspto-trademarks",
      sourceUrl: `https://tsdr.uspto.gov/#caseNumber=${tm.serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT`,
      sourceTier: 2,
      confidence: 0.65,
      rawData: { ...tm },
      extractedData: {
        name: tm.ownerName,
        company: null,
        title: tm.markLiteral,
        county: null,
        state: tm.ownerState ?? "FL",
        estimatedValueCents: null,
        date: tm.registrationDate ?? tm.filingDate,
      },
      idempotencyKey: `trademark-${tm.serialNumber}`,
    };
  }
}
