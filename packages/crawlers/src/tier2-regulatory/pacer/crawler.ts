import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface PacerCredentials {
  username: string;
  password: string;
  clientCode: string;
}

interface PacerCase {
  caseNumber: string;
  caseTitle: string;
  court: string;
  dateFiled: string;
  natureOfSuit: string;
  chapter?: string;
  debtorName?: string;
  plaintiffName?: string;
  defendantName?: string;
  amountDemanded?: number;
  county?: string;
  state?: string;
}

interface PacerSearchParams {
  dateStart: string;
  dateEnd: string;
  courts: string[];
  natureOfSuitCodes: string[];
  minAmountCents: bigint;
}

const FLORIDA_FEDERAL_COURTS = [
  "flsb", // Southern District of Florida
  "flmb", // Middle District of Florida
  "flnb", // Northern District of Florida
] as const;

const BANKRUPTCY_NOS_CODES = ["422", "423", "441", "442", "443"];
const CIVIL_HIGH_VALUE_NOS_CODES = [
  "110", // Insurance
  "190", // Other Contract
  "290", // Real Property
  "360", // Personal Injury — Product Liability
  "850", // Securities / Commodities / Exchange
  "893", // Environmental Matters
];

const MIN_CIVIL_AMOUNT_CENTS = 500_000_00n; // $500,000

export class PacerCrawler extends BaseCrawler {
  private readonly credentials: PacerCredentials;
  private authToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private static readonly PACER_API_BASE = "https://pcl.uscourts.gov/pcl-public-api/rest";
  private static readonly AUTH_URL = "https://pacer.login.uscourts.gov/csologin/login.jsf";

  constructor(
    credentials: PacerCredentials,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "pacer-federal-courts",
      tier: 2,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
      maxRetries: 2,
      circuitBreakerThreshold: 3,
      respectRobotsTxt: false, // API-based, not web scraping
      ...configOverrides,
    });
    this.credentials = credentials;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    await this.authenticate();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);

    const params: PacerSearchParams = {
      dateStart: yesterday.toISOString().slice(0, 10),
      dateEnd: now.toISOString().slice(0, 10),
      courts: [...FLORIDA_FEDERAL_COURTS],
      natureOfSuitCodes: [...BANKRUPTCY_NOS_CODES, ...CIVIL_HIGH_VALUE_NOS_CODES],
      minAmountCents: MIN_CIVIL_AMOUNT_CENTS,
    };

    const signals: ExtractedSignal[] = [];

    for (const court of params.courts) {
      const bankruptcyCases = await this.searchBankruptcyCases(court, params);
      for (const c of bankruptcyCases) {
        signals.push(this.toBankruptcySignal(c));
      }

      const civilCases = await this.searchCivilCases(court, params);
      for (const c of civilCases) {
        if (c.amountDemanded && BigInt(c.amountDemanded) >= params.minAmountCents) {
          signals.push(this.toCivilJudgmentSignal(c));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async authenticate(): Promise<void> {
    if (this.authToken && Date.now() < this.tokenExpiresAt) {
      return;
    }

    const response = await this.retryWithBackoff(async () => {
      const res = await fetch(PacerCrawler.AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: this.credentials.username,
          password: this.credentials.password,
          clientCode: this.credentials.clientCode,
        }),
      });
      if (!res.ok) {
        throw new Error(`PACER auth failed: ${res.status}`);
      }
      return res.json() as Promise<{ loginResult: { nextGenCSO: string } }>;
    });

    this.authToken = response.loginResult.nextGenCSO;
    this.tokenExpiresAt = Date.now() + 3_600_000; // 1 hour
  }

  private async searchBankruptcyCases(
    court: string,
    params: PacerSearchParams,
  ): Promise<PacerCase[]> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(
        `${PacerCrawler.PACER_API_BASE}/cases/find`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-NEXT-GEN-CSO": this.authToken!,
            "User-Agent": this.config.userAgent,
          },
          body: JSON.stringify({
            courtId: court,
            dateFiledStart: params.dateStart,
            dateFiledEnd: params.dateEnd,
            natureOfSuitCodes: BANKRUPTCY_NOS_CODES,
            caseType: "bk",
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`PACER search failed for ${court}: ${res.status}`);
      }
      const data = (await res.json()) as { content: PacerCase[] };
      return data.content ?? [];
    });
  }

  private async searchCivilCases(
    court: string,
    params: PacerSearchParams,
  ): Promise<PacerCase[]> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(
        `${PacerCrawler.PACER_API_BASE}/cases/find`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-NEXT-GEN-CSO": this.authToken!,
            "User-Agent": this.config.userAgent,
          },
          body: JSON.stringify({
            courtId: court,
            dateFiledStart: params.dateStart,
            dateFiledEnd: params.dateEnd,
            natureOfSuitCodes: CIVIL_HIGH_VALUE_NOS_CODES,
            caseType: "cv",
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`PACER civil search failed for ${court}: ${res.status}`);
      }
      const data = (await res.json()) as { content: PacerCase[] };
      return data.content ?? [];
    });
  }

  private toBankruptcySignal(c: PacerCase): ExtractedSignal {
    return {
      signalType: SignalTypes.BANKRUPTCY_EMERGENCE satisfies SignalType,
      source: "pacer",
      sourceUrl: `https://ecf.${c.court}.uscourts.gov/cgi-bin/DktRpt.pl?${c.caseNumber}`,
      sourceTier: 2,
      confidence: 0.85,
      rawData: { ...c },
      extractedData: {
        name: c.debtorName ?? c.caseTitle,
        company: null,
        title: null,
        county: c.county ?? null,
        state: c.state ?? "FL",
        estimatedValueCents: null,
        date: c.dateFiled,
      },
      idempotencyKey: `pacer-bk-${c.court}-${c.caseNumber}`,
    };
  }

  private toCivilJudgmentSignal(c: PacerCase): ExtractedSignal {
    return {
      signalType: SignalTypes.COURT_SETTLEMENT satisfies SignalType,
      source: "pacer",
      sourceUrl: `https://ecf.${c.court}.uscourts.gov/cgi-bin/DktRpt.pl?${c.caseNumber}`,
      sourceTier: 2,
      confidence: 0.7,
      rawData: { ...c },
      extractedData: {
        name: c.plaintiffName ?? c.caseTitle,
        company: c.defendantName ?? null,
        title: null,
        county: c.county ?? null,
        state: c.state ?? "FL",
        estimatedValueCents: c.amountDemanded?.toString() ?? null,
        date: c.dateFiled,
      },
      idempotencyKey: `pacer-cv-${c.court}-${c.caseNumber}`,
    };
  }
}
