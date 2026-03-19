import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface AuctionResult {
  lotId: string;
  title: string;
  description: string;
  saleDate: string;
  hammerPriceCents: bigint;
  estimateLowCents: bigint;
  estimateHighCents: bigint;
  buyerPaddleOrName: string | null;
  consignorName: string | null;
  auctionHouse: string;
  saleTitle: string;
  category: string;
  lotUrl: string;
}

interface AuctionSource {
  name: string;
  resultsUrl: string;
  type: "major-house" | "state-surplus" | "estate";
}

const AUCTION_SOURCES: AuctionSource[] = [
  {
    name: "Sotheby's",
    resultsUrl: "https://www.sothebys.com/en/api/results",
    type: "major-house",
  },
  {
    name: "Christie's",
    resultsUrl: "https://www.christies.com/api/results",
    type: "major-house",
  },
  {
    name: "FL DMS Surplus",
    resultsUrl: "https://www.dms.myflorida.com/business_operations/state_purchasing/surplus_property/api/results",
    type: "state-surplus",
  },
  {
    name: "Heritage Auctions",
    resultsUrl: "https://www.ha.com/api/results",
    type: "major-house",
  },
];

const MIN_HIGH_VALUE_CENTS = 100_000_00n; // $100,000
const MIN_SURPLUS_VALUE_CENTS = 50_000_00n; // $50,000

export class AuctionCrawler extends BaseCrawler {
  constructor(configOverrides: Partial<CrawlerConfig> = {}) {
    super({
      name: "auction-houses",
      tier: 3,
      maxConcurrentPages: 2,
      requestDelayMs: 3000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const source of AUCTION_SOURCES) {
      const results = await this.fetchAuctionResults(source);

      const threshold =
        source.type === "state-surplus"
          ? MIN_SURPLUS_VALUE_CENTS
          : MIN_HIGH_VALUE_CENTS;

      for (const result of results) {
        if (result.hammerPriceCents >= threshold) {
          signals.push(this.toSignal(result, source));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async fetchAuctionResults(source: AuctionSource): Promise<AuctionResult[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const dateFilter = sevenDaysAgo.toISOString().slice(0, 10);

    return this.retryWithBackoff(async () => {
      const url = new URL(source.resultsUrl);
      url.searchParams.set("dateFrom", dateFilter);
      url.searchParams.set("status", "sold");
      url.searchParams.set("region", "florida");
      url.searchParams.set("limit", "100");

      if (source.type === "major-house") {
        url.searchParams.set("sortBy", "price_desc");
      }

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Auction results fetch failed for ${source.name}: ${res.status}`);
      }

      const data = (await res.json()) as { lots: Record<string, unknown>[] };
      return (data.lots ?? []).map((lot) => this.parseLot(lot, source));
    });
  }

  private parseLot(
    lot: Record<string, unknown>,
    source: AuctionSource,
  ): AuctionResult {
    const hammerPrice = Number(lot.hammerPrice ?? lot.price ?? lot.salePrice ?? 0);
    const estimateLow = Number(lot.estimateLow ?? lot.lowEstimate ?? 0);
    const estimateHigh = Number(lot.estimateHigh ?? lot.highEstimate ?? 0);

    return {
      lotId: String(lot.lotId ?? lot.id ?? ""),
      title: String(lot.title ?? lot.lotTitle ?? ""),
      description: String(lot.description ?? ""),
      saleDate: String(lot.saleDate ?? lot.date ?? ""),
      hammerPriceCents: BigInt(Math.round(hammerPrice * 100)),
      estimateLowCents: BigInt(Math.round(estimateLow * 100)),
      estimateHighCents: BigInt(Math.round(estimateHigh * 100)),
      buyerPaddleOrName: lot.buyerName ? String(lot.buyerName) : null,
      consignorName: lot.consignorName ? String(lot.consignorName) : null,
      auctionHouse: source.name,
      saleTitle: String(lot.saleTitle ?? lot.auction ?? ""),
      category: String(lot.category ?? ""),
      lotUrl: String(lot.url ?? lot.lotUrl ?? ""),
    };
  }

  private toSignal(result: AuctionResult, source: AuctionSource): ExtractedSignal {
    const signalType: SignalType =
      source.type === "state-surplus"
        ? SignalTypes.AUCTION_CONSIGNMENT
        : SignalTypes.AUCTION_CONSIGNMENT;

    const primaryName =
      result.consignorName ?? result.buyerPaddleOrName ?? null;

    return {
      signalType,
      source: result.auctionHouse,
      sourceUrl: result.lotUrl || null,
      sourceTier: 3,
      confidence: source.type === "major-house" ? 0.7 : 0.55,
      rawData: {
        lotId: result.lotId,
        title: result.title,
        saleTitle: result.saleTitle,
        category: result.category,
        hammerPriceCents: result.hammerPriceCents.toString(),
        estimateLowCents: result.estimateLowCents.toString(),
        estimateHighCents: result.estimateHighCents.toString(),
      },
      extractedData: {
        name: primaryName,
        company: result.auctionHouse,
        title: result.title,
        county: null,
        state: "FL",
        estimatedValueCents: result.hammerPriceCents.toString(),
        date: result.saleDate,
      },
      idempotencyKey: `auction-${result.auctionHouse}-${result.lotId}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}
