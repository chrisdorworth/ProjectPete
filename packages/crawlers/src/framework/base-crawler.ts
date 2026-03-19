import type { SignalType } from "@meridian/domain";

export interface CrawlResult {
  signals: ExtractedSignal[];
  errorsCount: number;
  pagesProcessed: number;
  durationMs: number;
}

export interface ExtractedSignal {
  signalType: SignalType;
  source: string;
  sourceUrl: string | null;
  sourceTier: 1 | 2 | 3 | 4;
  confidence: number;
  rawData: Record<string, unknown>;
  extractedData: {
    name: string | null;
    company: string | null;
    title: string | null;
    county: string | null;
    state: string | null;
    estimatedValueCents: string | null;
    date: string | null;
  };
  idempotencyKey: string;
}

export interface CrawlerConfig {
  name: string;
  tier: 1 | 2 | 3 | 4;
  maxConcurrentPages: number;
  requestDelayMs: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
  respectRobotsTxt: boolean;
  userAgent: string;
}

const DEFAULT_CONFIG: Partial<CrawlerConfig> = {
  maxConcurrentPages: 2,
  requestDelayMs: 2000,
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  respectRobotsTxt: true,
  userAgent: "MeridianBot/1.0 (+https://meridian.example.com/bot)",
};

export abstract class BaseCrawler {
  protected config: CrawlerConfig;
  private consecutiveFailures = 0;
  private isCircuitOpen = false;
  private circuitOpenedAt: number | null = null;
  private readonly circuitResetMs = 300_000; // 5 minutes

  constructor(config: Partial<CrawlerConfig> & Pick<CrawlerConfig, "name" | "tier">) {
    this.config = { ...DEFAULT_CONFIG, ...config } as CrawlerConfig;
  }

  async execute(): Promise<CrawlResult> {
    if (this.isCircuitOpen) {
      if (Date.now() - (this.circuitOpenedAt ?? 0) > this.circuitResetMs) {
        this.isCircuitOpen = false;
        this.consecutiveFailures = 0;
      } else {
        return {
          signals: [],
          errorsCount: 0,
          pagesProcessed: 0,
          durationMs: 0,
        };
      }
    }

    const startTime = Date.now();
    let errorsCount = 0;

    try {
      const signals = await this.crawl();
      this.consecutiveFailures = 0;

      return {
        signals,
        errorsCount,
        pagesProcessed: signals.length,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.consecutiveFailures++;
      errorsCount++;

      if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        this.isCircuitOpen = true;
        this.circuitOpenedAt = Date.now();
      }

      return {
        signals: [],
        errorsCount,
        pagesProcessed: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }

  protected abstract crawl(): Promise<ExtractedSignal[]>;

  protected async delay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.config.requestDelayMs));
  }

  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = this.config.maxRetries,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries) throw error;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Unreachable");
  }

  get name(): string {
    return this.config.name;
  }

  get tier(): number {
    return this.config.tier;
  }

  getCircuitState(): "closed" | "open" | "half-open" {
    if (!this.isCircuitOpen) return "closed";
    if (Date.now() - (this.circuitOpenedAt ?? 0) > this.circuitResetMs) return "half-open";
    return "open";
  }
}
