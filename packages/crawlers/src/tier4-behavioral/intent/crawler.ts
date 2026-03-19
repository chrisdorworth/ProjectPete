import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface IntentRecord {
  domain: string;
  companyName: string;
  compositeScore: number;
  topicId: string;
  topicName: string;
  clusterName: string;
  surgeScore: number;
  averageScore: number;
  firstSeen: string;
  lastSeen: string;
  location: string | null;
  employeeRange: string | null;
  industry: string | null;
}

interface BomboraApiConfig {
  apiKey: string;
  accountId: string;
  baseUrl: string;
}

const FINANCIAL_PLANNING_TOPICS = [
  "financial_planning",
  "retirement_planning",
  "estate_planning",
  "wealth_management",
  "trust_services",
  "tax_planning",
  "life_insurance",
  "annuities",
  "succession_planning",
  "business_exit_planning",
  "mergers_acquisitions",
  "401k_rollover",
  "ira_planning",
  "charitable_giving",
  "family_office",
];

const SURGE_THRESHOLD = 70;
const RESEARCH_THRESHOLD = 50;
const FL_LOCATIONS = ["florida", "fl", "miami", "orlando", "tampa", "jacksonville", "fort lauderdale"];

export class IntentCrawler extends BaseCrawler {
  private readonly bomboraConfig: BomboraApiConfig;

  constructor(
    bomboraConfig: BomboraApiConfig,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "bombora-intent",
      tier: 4,
      maxConcurrentPages: 1,
      requestDelayMs: 1000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: false, // API-based
      ...configOverrides,
    });
    this.bomboraConfig = bomboraConfig;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const topic of FINANCIAL_PLANNING_TOPICS) {
      const records = await this.fetchIntentData(topic);

      for (const record of records) {
        if (!this.isFloridaLocation(record.location)) {
          continue;
        }

        if (record.surgeScore >= SURGE_THRESHOLD) {
          signals.push(this.toSurgeSignal(record));
        } else if (record.compositeScore >= RESEARCH_THRESHOLD) {
          signals.push(this.toResearchSignal(record));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async fetchIntentData(topicId: string): Promise<IntentRecord[]> {
    return this.retryWithBackoff(async () => {
      const url = new URL(
        `${this.bomboraConfig.baseUrl}/v2/surge/topics/${topicId}`,
      );
      url.searchParams.set("accountId", this.bomboraConfig.accountId);
      url.searchParams.set("minScore", String(RESEARCH_THRESHOLD));
      url.searchParams.set("limit", "200");
      url.searchParams.set("state", "FL");

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bomboraConfig.apiKey}`,
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Bombora intent fetch failed for ${topicId}: ${res.status}`);
      }

      const data = (await res.json()) as { results: Record<string, unknown>[] };
      return (data.results ?? []).map((r) => ({
        domain: String(r.domain ?? ""),
        companyName: String(r.companyName ?? r.company ?? ""),
        compositeScore: Number(r.compositeScore ?? r.score ?? 0),
        topicId: String(r.topicId ?? topicId),
        topicName: String(r.topicName ?? topicId),
        clusterName: String(r.clusterName ?? ""),
        surgeScore: Number(r.surgeScore ?? r.surge ?? 0),
        averageScore: Number(r.averageScore ?? r.baseline ?? 0),
        firstSeen: String(r.firstSeen ?? ""),
        lastSeen: String(r.lastSeen ?? ""),
        location: r.location ? String(r.location) : null,
        employeeRange: r.employeeRange ? String(r.employeeRange) : null,
        industry: r.industry ? String(r.industry) : null,
      }));
    });
  }

  private isFloridaLocation(location: string | null): boolean {
    if (!location) return false;
    const lower = location.toLowerCase();
    return FL_LOCATIONS.some((loc) => lower.includes(loc));
  }

  private toSurgeSignal(record: IntentRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.INTENT_SURGE satisfies SignalType,
      source: "bombora",
      sourceUrl: null,
      sourceTier: 4,
      confidence: Math.min(record.surgeScore / 100, 0.65),
      rawData: { ...record },
      extractedData: {
        name: null,
        company: record.companyName,
        title: `Intent Surge: ${record.topicName}`,
        county: null,
        state: "FL",
        estimatedValueCents: null,
        date: record.lastSeen,
      },
      idempotencyKey: `intent-surge-${record.domain}-${record.topicId}-${record.lastSeen.slice(0, 10)}`,
    };
  }

  private toResearchSignal(record: IntentRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.INTENT_RESEARCH satisfies SignalType,
      source: "bombora",
      sourceUrl: null,
      sourceTier: 4,
      confidence: Math.min(record.compositeScore / 100, 0.5),
      rawData: { ...record },
      extractedData: {
        name: null,
        company: record.companyName,
        title: `Research: ${record.topicName}`,
        county: null,
        state: "FL",
        estimatedValueCents: null,
        date: record.lastSeen,
      },
      idempotencyKey: `intent-research-${record.domain}-${record.topicId}-${record.lastSeen.slice(0, 10)}`,
    };
  }
}
