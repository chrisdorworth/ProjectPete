import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface LinkedInProfileChange {
  profileId: string;
  linkedinUrl: string;
  fullName: string;
  previousTitle: string | null;
  currentTitle: string | null;
  previousCompany: string | null;
  currentCompany: string | null;
  changeType: "job_change" | "promotion" | "retirement" | "new_company" | "title_update";
  detectedAt: string;
  location: string | null;
  headline: string | null;
}

interface MonitoredLead {
  linkedinProfileId: string;
  lastKnownTitle: string | null;
  lastKnownCompany: string | null;
  lastCheckedAt: string;
}

interface ProxyApiConfig {
  apiKey: string;
  baseUrl: string;
  maxRequestsPerDay: number;
}

const RETIREMENT_KEYWORDS = [
  "retired",
  "retirement",
  "emeritus",
  "former",
  "ex-",
  "enjoying retirement",
  "retired from",
];

const PROMOTION_TITLE_RANKS: Record<string, number> = {
  intern: 0,
  analyst: 1,
  associate: 2,
  manager: 3,
  senior: 4,
  director: 5,
  "vice president": 6,
  vp: 6,
  svp: 7,
  "senior vice president": 7,
  evp: 8,
  "executive vice president": 8,
  "c-suite": 9,
  coo: 9,
  cfo: 9,
  cto: 9,
  ceo: 10,
  president: 10,
  chairman: 11,
  founder: 10,
  "co-founder": 10,
  partner: 8,
  "managing partner": 9,
  principal: 7,
};

export class LinkedInProxyCrawler extends BaseCrawler {
  private readonly proxyConfig: ProxyApiConfig;
  private requestsToday = 0;
  private lastResetDate: string = "";

  constructor(
    proxyConfig: ProxyApiConfig,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "linkedin-proxy",
      tier: 3,
      maxConcurrentPages: 1,
      requestDelayMs: 5000,
      maxRetries: 2,
      circuitBreakerThreshold: 3,
      respectRobotsTxt: false, // API-based proxy
      ...configOverrides,
    });
    this.proxyConfig = proxyConfig;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    this.resetDailyCounterIfNeeded();

    const leads = await this.fetchMonitoredLeads();
    const signals: ExtractedSignal[] = [];

    for (const lead of leads) {
      if (this.requestsToday >= this.proxyConfig.maxRequestsPerDay) {
        break;
      }

      const change = await this.checkProfileForChanges(lead);
      if (change) {
        const signal = this.toSignal(change);
        if (signal) {
          signals.push(signal);
        }
      }

      this.requestsToday++;
      await this.delay();
    }

    return signals;
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastResetDate !== today) {
      this.requestsToday = 0;
      this.lastResetDate = today;
    }
  }

  private async fetchMonitoredLeads(): Promise<MonitoredLead[]> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(
        `${this.proxyConfig.baseUrl}/v1/monitored-leads?status=active&limit=500`,
        {
          headers: {
            Authorization: `Bearer ${this.proxyConfig.apiKey}`,
            "User-Agent": this.config.userAgent,
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch monitored leads: ${res.status}`);
      }

      const data = (await res.json()) as { leads: MonitoredLead[] };
      return data.leads ?? [];
    });
  }

  private async checkProfileForChanges(
    lead: MonitoredLead,
  ): Promise<LinkedInProfileChange | null> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(
        `${this.proxyConfig.baseUrl}/v1/profiles/${lead.linkedinProfileId}`,
        {
          headers: {
            Authorization: `Bearer ${this.proxyConfig.apiKey}`,
            "User-Agent": this.config.userAgent,
          },
        },
      );

      if (!res.ok) {
        if (res.status === 429) {
          this.requestsToday = this.proxyConfig.maxRequestsPerDay;
          return null;
        }
        throw new Error(`Profile fetch failed: ${res.status}`);
      }

      const profile = (await res.json()) as Record<string, unknown>;
      return this.detectChange(profile, lead);
    });
  }

  private detectChange(
    profile: Record<string, unknown>,
    lead: MonitoredLead,
  ): LinkedInProfileChange | null {
    const currentTitle = profile.title ? String(profile.title) : null;
    const currentCompany = profile.company ? String(profile.company) : null;
    const fullName = String(profile.fullName ?? profile.name ?? "Unknown");
    const headline = profile.headline ? String(profile.headline) : null;
    const location = profile.location ? String(profile.location) : null;
    const linkedinUrl = String(profile.linkedinUrl ?? profile.url ?? "");

    const titleChanged = currentTitle !== lead.lastKnownTitle;
    const companyChanged = currentCompany !== lead.lastKnownCompany;

    if (!titleChanged && !companyChanged) {
      return null;
    }

    let changeType: LinkedInProfileChange["changeType"] = "title_update";

    if (this.isRetirementSignal(currentTitle, headline)) {
      changeType = "retirement";
    } else if (companyChanged && lead.lastKnownCompany) {
      changeType = "job_change";
    } else if (titleChanged && this.isPromotion(lead.lastKnownTitle, currentTitle)) {
      changeType = "promotion";
    }

    return {
      profileId: lead.linkedinProfileId,
      linkedinUrl,
      fullName,
      previousTitle: lead.lastKnownTitle,
      currentTitle,
      previousCompany: lead.lastKnownCompany,
      currentCompany,
      changeType,
      detectedAt: new Date().toISOString(),
      location,
      headline,
    };
  }

  private isRetirementSignal(
    title: string | null,
    headline: string | null,
  ): boolean {
    const text = `${title ?? ""} ${headline ?? ""}`.toLowerCase();
    return RETIREMENT_KEYWORDS.some((kw) => text.includes(kw));
  }

  private isPromotion(
    previousTitle: string | null,
    currentTitle: string | null,
  ): boolean {
    if (!previousTitle || !currentTitle) return false;
    const prevRank = this.getTitleRank(previousTitle);
    const currRank = this.getTitleRank(currentTitle);
    return currRank > prevRank;
  }

  private getTitleRank(title: string): number {
    const lower = title.toLowerCase();
    let maxRank = -1;
    for (const [keyword, rank] of Object.entries(PROMOTION_TITLE_RANKS)) {
      if (lower.includes(keyword) && rank > maxRank) {
        maxRank = rank;
      }
    }
    return maxRank;
  }

  private toSignal(change: LinkedInProfileChange): ExtractedSignal | null {
    let signalType: SignalType;

    switch (change.changeType) {
      case "retirement":
        signalType = SignalTypes.LINKEDIN_RETIREMENT;
        break;
      case "job_change":
      case "new_company":
        signalType = SignalTypes.LINKEDIN_STATUS_CHANGE;
        break;
      case "promotion":
      case "title_update":
        signalType = SignalTypes.LINKEDIN_STATUS_CHANGE;
        break;
      default:
        return null;
    }

    const confidence =
      change.changeType === "retirement"
        ? 0.75
        : change.changeType === "job_change"
          ? 0.7
          : 0.55;

    return {
      signalType,
      source: "linkedin-proxy",
      sourceUrl: change.linkedinUrl || null,
      sourceTier: 3,
      confidence,
      rawData: { ...change },
      extractedData: {
        name: change.fullName,
        company: change.currentCompany,
        title: change.currentTitle,
        county: null,
        state: null,
        estimatedValueCents: null,
        date: change.detectedAt,
      },
      idempotencyKey: `linkedin-${change.changeType}-${change.profileId}-${change.detectedAt.slice(0, 10)}`,
    };
  }
}
