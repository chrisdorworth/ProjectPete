import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface CommercialReTransaction {
  recordId: string;
  propertyAddress: string;
  propertyType: string;
  salePrice: number;
  saleDate: string;
  grantor: string;
  grantee: string;
  county: string;
  squareFootage: number | null;
  acreage: number | null;
  documentNumber: string;
  instrumentType: "deed" | "lease" | "mortgage" | "assignment";
}

interface CountyDeedSource {
  county: string;
  apiUrl: string;
  format: "json" | "xml";
}

const FL_COUNTY_DEED_SOURCES: CountyDeedSource[] = [
  {
    county: "Orange",
    apiUrl: "https://or.occompt.com/recorder/api/recordings",
    format: "json",
  },
  {
    county: "Osceola",
    apiUrl: "https://or.clerk.osceola.org/api/recordings",
    format: "json",
  },
  {
    county: "Seminole",
    apiUrl: "https://www.seminoleclerk.org/api/recordings",
    format: "json",
  },
  {
    county: "Hillsborough",
    apiUrl: "https://pubrec.hillsclerk.com/api/recordings",
    format: "json",
  },
  {
    county: "Pinellas",
    apiUrl: "https://officialrecords.mypinellasclerk.org/api/recordings",
    format: "json",
  },
  {
    county: "Miami-Dade",
    apiUrl: "https://www2.miami-dadeclerk.com/officialrecords/api/recordings",
    format: "json",
  },
  {
    county: "Broward",
    apiUrl: "https://officialrecords.broward.org/api/recordings",
    format: "json",
  },
  {
    county: "Palm Beach",
    apiUrl: "https://oris.co.palm-beach.fl.us/api/recordings",
    format: "json",
  },
];

const MIN_COMMERCIAL_SALE_CENTS = 1_000_000_00n; // $1,000,000
const MIN_COMMERCIAL_LEASE_CENTS = 500_000_00n; // $500,000

const COMMERCIAL_PROPERTY_TYPES = [
  "commercial",
  "office",
  "retail",
  "industrial",
  "warehouse",
  "multifamily",
  "hotel",
  "mixed-use",
  "medical",
];

export class CommercialReCrawler extends BaseCrawler {
  constructor(configOverrides: Partial<CrawlerConfig> = {}) {
    super({
      name: "commercial-re-transactions",
      tier: 3,
      maxConcurrentPages: 2,
      requestDelayMs: 2000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const source of FL_COUNTY_DEED_SOURCES) {
      const transactions = await this.fetchCountyRecords(source);

      for (const tx of transactions) {
        const priceCents = BigInt(Math.round(tx.salePrice * 100));

        if (
          tx.instrumentType === "deed" &&
          priceCents >= MIN_COMMERCIAL_SALE_CENTS &&
          this.isCommercialProperty(tx.propertyType)
        ) {
          signals.push(this.toSaleSignal(tx));
        }

        if (
          tx.instrumentType === "lease" &&
          priceCents >= MIN_COMMERCIAL_LEASE_CENTS
        ) {
          signals.push(this.toLeaseSignal(tx));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async fetchCountyRecords(source: CountyDeedSource): Promise<CommercialReTransaction[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const dateFilter = sevenDaysAgo.toISOString().slice(0, 10);

    return this.retryWithBackoff(async () => {
      const url = new URL(source.apiUrl);
      url.searchParams.set("dateFrom", dateFilter);
      url.searchParams.set("instrumentTypes", "deed,lease,assignment");
      url.searchParams.set("minAmount", "500000");
      url.searchParams.set("limit", "200");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`County records fetch failed for ${source.county}: ${res.status}`);
      }

      const data = (await res.json()) as { records: Record<string, unknown>[] };
      return (data.records ?? []).map((r) => ({
        recordId: String(r.recordId ?? r.id ?? ""),
        propertyAddress: String(r.propertyAddress ?? r.address ?? ""),
        propertyType: String(r.propertyType ?? r.type ?? "unknown"),
        salePrice: Number(r.salePrice ?? r.consideration ?? r.amount ?? 0),
        saleDate: String(r.saleDate ?? r.recordDate ?? ""),
        grantor: String(r.grantor ?? r.seller ?? ""),
        grantee: String(r.grantee ?? r.buyer ?? ""),
        county: source.county,
        squareFootage: r.squareFootage ? Number(r.squareFootage) : null,
        acreage: r.acreage ? Number(r.acreage) : null,
        documentNumber: String(r.documentNumber ?? r.instrumentNumber ?? ""),
        instrumentType: this.normalizeInstrumentType(String(r.instrumentType ?? "deed")),
      }));
    });
  }

  private normalizeInstrumentType(
    raw: string,
  ): "deed" | "lease" | "mortgage" | "assignment" {
    const lower = raw.toLowerCase();
    if (lower.includes("lease")) return "lease";
    if (lower.includes("mortgage")) return "mortgage";
    if (lower.includes("assign")) return "assignment";
    return "deed";
  }

  private isCommercialProperty(propertyType: string): boolean {
    const lower = propertyType.toLowerCase();
    return COMMERCIAL_PROPERTY_TYPES.some((t) => lower.includes(t));
  }

  private toSaleSignal(tx: CommercialReTransaction): ExtractedSignal {
    const priceCents = BigInt(Math.round(tx.salePrice * 100));
    return {
      signalType: SignalTypes.COMMERCIAL_RE_SALE satisfies SignalType,
      source: `${tx.county} County Records`,
      sourceUrl: null,
      sourceTier: 3,
      confidence: 0.75,
      rawData: { ...tx },
      extractedData: {
        name: tx.grantee || tx.grantor,
        company: null,
        title: `${tx.propertyType} - ${tx.propertyAddress}`,
        county: tx.county,
        state: "FL",
        estimatedValueCents: priceCents.toString(),
        date: tx.saleDate,
      },
      idempotencyKey: `cre-sale-${tx.county}-${tx.documentNumber}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  private toLeaseSignal(tx: CommercialReTransaction): ExtractedSignal {
    const priceCents = BigInt(Math.round(tx.salePrice * 100));
    return {
      signalType: SignalTypes.COMMERCIAL_RE_SALE satisfies SignalType,
      source: `${tx.county} County Records`,
      sourceUrl: null,
      sourceTier: 3,
      confidence: 0.6,
      rawData: { ...tx, isLease: true },
      extractedData: {
        name: tx.grantee || tx.grantor,
        company: null,
        title: `Lease - ${tx.propertyType} - ${tx.propertyAddress}`,
        county: tx.county,
        state: "FL",
        estimatedValueCents: priceCents.toString(),
        date: tx.saleDate,
      },
      idempotencyKey: `cre-lease-${tx.county}-${tx.documentNumber}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}
