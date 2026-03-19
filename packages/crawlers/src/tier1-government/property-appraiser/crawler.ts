import type { SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
} from "../../framework/base-crawler.js";
import { extractTable, extractLinks, cleanText } from "../../framework/html-extractor.js";
import { extractEntities } from "../../framework/ai-extractor.js";
import { isAllowed } from "../../framework/robots-parser.js";
import { browserPool } from "../../framework/browser-pool.js";

interface PropertyRecord {
  parcelId: string;
  ownerName: string;
  previousOwner: string | null;
  saleDate: string | null;
  saleAmountCents: bigint | null;
  assessedValueCents: bigint | null;
  previousAssessedValueCents: bigint | null;
  address: string;
  homesteadExemption: boolean;
  previousHomesteadExemption: boolean | null;
  county: string;
  detailUrl: string | null;
}

interface CountyAppraiserConfig {
  county: string;
  searchUrl: string;
  baseUrl: string;
  tableSelector: string;
}

const FLORIDA_APPRAISER_COUNTIES: CountyAppraiserConfig[] = [
  {
    county: "Orange",
    searchUrl: "https://www.ocpafl.org/Searches/ParcelSearch.aspx",
    baseUrl: "https://www.ocpafl.org",
    tableSelector: "table.results, table#searchResults, #gridResults table",
  },
  {
    county: "Osceola",
    searchUrl: "https://ira.property-appraiser.org/IRASuite/search",
    baseUrl: "https://ira.property-appraiser.org",
    tableSelector: "table.results, table.property-list, #searchGrid table",
  },
  {
    county: "Seminole",
    searchUrl: "https://www.scpafl.org/PropertySearch",
    baseUrl: "https://www.scpafl.org",
    tableSelector: "table.results, table#propertyResults, .property-grid table",
  },
  {
    county: "Brevard",
    searchUrl: "https://www.bcpao.us/PropertySearch",
    baseUrl: "https://www.bcpao.us",
    tableSelector: "table.results, table#searchResults, .search-results table",
  },
  {
    county: "Lake",
    searchUrl: "https://www.lakecopropappr.com/search",
    baseUrl: "https://www.lakecopropappr.com",
    tableSelector: "table.results, table.property-list, #results table",
  },
  {
    county: "Volusia",
    searchUrl: "https://vcpa.vcgov.org/search",
    baseUrl: "https://vcpa.vcgov.org",
    tableSelector: "table.results, table.searchResults, #propertyGrid table",
  },
];

export class PropertyAppraiserCrawler extends BaseCrawler {
  private readonly counties: CountyAppraiserConfig[];

  constructor(counties?: CountyAppraiserConfig[]) {
    super({
      name: "property-appraiser",
      tier: 1,
      maxConcurrentPages: 1,
      requestDelayMs: 3000,
    });
    this.counties = counties ?? FLORIDA_APPRAISER_COUNTIES;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const countyConfig of this.counties) {
      try {
        const countySignals = await this.retryWithBackoff(() =>
          this.crawlCounty(countyConfig),
        );
        signals.push(...countySignals);
        await this.delay();
      } catch {
        // Individual county failure should not stop others
      }
    }

    return signals;
  }

  private async crawlCounty(config: CountyAppraiserConfig): Promise<ExtractedSignal[]> {
    const allowed = await isAllowed(config.searchUrl, this.config.userAgent);
    if (!allowed) {
      return [];
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url =
      `${config.searchUrl}?saleStartDate=${startDate.toISOString().split("T")[0]}` +
      `&saleEndDate=${now.toISOString().split("T")[0]}` +
      `&recentSales=true`;

    const page = await browserPool.acquirePage();
    const signals: ExtractedSignal[] = [];

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      const html = await page.content();

      const records = this.parsePropertyResults(html, config);

      for (const record of records) {
        const signalType = this.resolveSignalType(record);
        if (!signalType) continue;

        let nerText = `${record.ownerName} ${record.address} ${record.previousOwner ?? ""}`;

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

        const nerResult = await extractEntities(
          nerText,
          `${config.county} County property transfer`,
        );
        const primaryPerson = nerResult.persons[0] ?? null;

        signals.push({
          signalType,
          source: `${config.county} County Property Appraiser`,
          sourceUrl: record.detailUrl ?? config.searchUrl,
          sourceTier: 1,
          confidence: nerResult.confidence,
          rawData: {
            parcelId: record.parcelId,
            ownerName: record.ownerName,
            previousOwner: record.previousOwner,
            saleDate: record.saleDate,
            saleAmountCents: record.saleAmountCents !== null
              ? String(record.saleAmountCents)
              : null,
            assessedValueCents: record.assessedValueCents !== null
              ? String(record.assessedValueCents)
              : null,
            homesteadExemption: record.homesteadExemption,
            address: record.address,
          },
          extractedData: {
            name: primaryPerson?.name ?? record.ownerName,
            company: primaryPerson?.company ?? null,
            title: null,
            county: config.county,
            state: "FL",
            estimatedValueCents: record.saleAmountCents !== null
              ? String(record.saleAmountCents)
              : record.assessedValueCents !== null
                ? String(record.assessedValueCents)
                : null,
            date: record.saleDate ?? null,
          },
          idempotencyKey: `prop-appraiser-${config.county.toLowerCase()}-${record.parcelId}-${record.saleDate ?? "no-date"}`,
        });

        await this.delay();
      }
    } finally {
      await browserPool.releasePage(page);
    }

    return signals;
  }

  private parsePropertyResults(
    html: string,
    config: CountyAppraiserConfig,
  ): PropertyRecord[] {
    const rows = extractTable(html, config.tableSelector);
    const links = extractLinks(
      html,
      "table a[href*='parcel'], table a[href*='property'], table a[href*='detail']",
      config.baseUrl,
    );

    return rows.map((row, index) => {
      const saleAmountStr = row["sale_amount"] ?? row["sale_price"] ?? row["last_sale_price"] ?? null;
      const assessedStr = row["assessed_value"] ?? row["just_value"] ?? row["market_value"] ?? null;
      const prevAssessedStr = row["previous_assessed"] ?? row["prior_value"] ?? null;

      return {
        parcelId: row["parcel_id"] ?? row["parcel"] ?? row["folio"] ?? row["col_0"] ?? "",
        ownerName: row["owner"] ?? row["owner_name"] ?? row["col_1"] ?? "",
        previousOwner: row["previous_owner"] ?? row["prior_owner"] ?? null,
        saleDate: row["sale_date"] ?? row["last_sale_date"] ?? row["col_3"] ?? null,
        saleAmountCents: this.parseCurrencyToCents(saleAmountStr),
        assessedValueCents: this.parseCurrencyToCents(assessedStr),
        previousAssessedValueCents: this.parseCurrencyToCents(prevAssessedStr),
        address: row["address"] ?? row["site_address"] ?? row["property_address"] ?? row["col_2"] ?? "",
        homesteadExemption: (row["homestead"] ?? row["hx"] ?? "").toLowerCase().includes("yes"),
        previousHomesteadExemption: null,
        county: config.county,
        detailUrl: links[index] ?? null,
      };
    });
  }

  private resolveSignalType(record: PropertyRecord): SignalType | null {
    if (record.saleAmountCents !== null && record.saleAmountCents > BigInt(0)) {
      return "deed_transfer";
    }

    if (record.homesteadExemption !== record.previousHomesteadExemption && record.previousHomesteadExemption !== null) {
      return "homestead_change";
    }

    if (
      record.assessedValueCents !== null &&
      record.previousAssessedValueCents !== null &&
      record.previousAssessedValueCents > BigInt(0)
    ) {
      const changePercent = Number(
        ((record.assessedValueCents - record.previousAssessedValueCents) * BigInt(100)) /
          record.previousAssessedValueCents,
      );
      if (Math.abs(changePercent) >= 20) {
        return "property_value_change";
      }
    }

    return null;
  }

  private parseCurrencyToCents(value: string | null): bigint | null {
    if (!value) return null;
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    return BigInt(Math.round(parsed * 100));
  }
}
