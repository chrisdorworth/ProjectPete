import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface LicenseRecord {
  licenseeId: string;
  fullName: string;
  licenseType: string;
  licenseNumber: string;
  status: string;
  issueDate: string;
  expirationDate?: string;
  disciplinaryAction?: string;
  profession: string;
  county?: string;
  boardName: string;
  company?: string;
}

interface BoardSource {
  name: string;
  apiUrl: string;
  boardCode: string;
  professions: string[];
}

const FL_LICENSE_BOARDS: BoardSource[] = [
  {
    name: "FL DBPR",
    apiUrl: "https://www.myfloridalicense.com/wl11.asp",
    boardCode: "dbpr",
    professions: ["real_estate", "cpa", "architect", "engineer", "contractor"],
  },
  {
    name: "FL Board of Medicine",
    apiUrl: "https://mqa-internet.doh.state.fl.us/MQASearchServices/api/lookuplicense",
    boardCode: "med",
    professions: ["physician", "osteopath", "podiatrist"],
  },
  {
    name: "FL Board of Dentistry",
    apiUrl: "https://mqa-internet.doh.state.fl.us/MQASearchServices/api/lookuplicense",
    boardCode: "dental",
    professions: ["dentist", "dental_hygienist"],
  },
  {
    name: "FL Bar Association",
    apiUrl: "https://www.floridabar.org/directories/find-mbr/",
    boardCode: "bar",
    professions: ["attorney"],
  },
];

const STATUS_RETIREMENT_KEYWORDS = [
  "retired",
  "voluntary inactive",
  "voluntary surrender",
  "emeritus",
  "inactive - retired",
];

const STATUS_NEW_LICENSE_KEYWORDS = ["active", "clear active", "new"];

export class LicenseBoardsCrawler extends BaseCrawler {
  constructor(configOverrides: Partial<CrawlerConfig> = {}) {
    super({
      name: "fl-license-boards",
      tier: 2,
      maxConcurrentPages: 1,
      requestDelayMs: 2500,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const board of FL_LICENSE_BOARDS) {
      const records = await this.fetchBoardRecords(board);

      for (const record of records) {
        const statusLower = record.status.toLowerCase();

        if (STATUS_RETIREMENT_KEYWORDS.some((kw) => statusLower.includes(kw))) {
          signals.push(this.toRetirementSignal(record));
        } else if (this.isRecentNewLicense(record)) {
          signals.push(this.toNewLicenseSignal(record));
        }

        if (record.disciplinaryAction) {
          signals.push(this.toDisciplinarySignal(record));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async fetchBoardRecords(board: BoardSource): Promise<LicenseRecord[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const dateFilter = thirtyDaysAgo.toISOString().slice(0, 10);

    return this.retryWithBackoff(async () => {
      const res = await fetch(board.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.config.userAgent,
        },
        body: JSON.stringify({
          board: board.boardCode,
          changedSince: dateFilter,
          professions: board.professions,
          limit: 500,
        }),
      });

      if (!res.ok) {
        throw new Error(`License board fetch failed for ${board.name}: ${res.status}`);
      }

      const raw = (await res.json()) as Record<string, string>[];
      return raw.map((r) => ({
        licenseeId: r.licensee_id ?? r.id ?? "",
        fullName: r.full_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        licenseType: r.license_type ?? r.type ?? "Unknown",
        licenseNumber: r.license_number ?? r.number ?? "",
        status: r.status ?? "Unknown",
        issueDate: r.issue_date ?? r.original_date ?? "",
        expirationDate: r.expiration_date ?? undefined,
        disciplinaryAction: r.disciplinary_action ?? undefined,
        profession: r.profession ?? board.professions[0] ?? "Unknown",
        county: r.county ?? undefined,
        boardName: board.name,
        company: r.employer ?? r.firm_name ?? undefined,
      }));
    });
  }

  private isRecentNewLicense(record: LicenseRecord): boolean {
    const statusLower = record.status.toLowerCase();
    if (!STATUS_NEW_LICENSE_KEYWORDS.some((kw) => statusLower.includes(kw))) {
      return false;
    }

    const issueDate = new Date(record.issueDate);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    return issueDate >= thirtyDaysAgo;
  }

  private toRetirementSignal(record: LicenseRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.PROFESSIONAL_RETIREMENT satisfies SignalType,
      source: record.boardName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.8,
      rawData: { ...record },
      extractedData: {
        name: record.fullName,
        company: record.company ?? null,
        title: record.profession,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: null,
        date: record.expirationDate ?? record.issueDate,
      },
      idempotencyKey: `license-retire-${record.boardName}-${record.licenseNumber}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  private toNewLicenseSignal(record: LicenseRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.LICENSE_SURRENDER satisfies SignalType,
      source: record.boardName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.5,
      rawData: { ...record },
      extractedData: {
        name: record.fullName,
        company: record.company ?? null,
        title: record.profession,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: null,
        date: record.issueDate,
      },
      idempotencyKey: `license-new-${record.boardName}-${record.licenseNumber}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  private toDisciplinarySignal(record: LicenseRecord): ExtractedSignal {
    return {
      signalType: SignalTypes.LICENSE_SURRENDER satisfies SignalType,
      source: record.boardName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.65,
      rawData: { ...record },
      extractedData: {
        name: record.fullName,
        company: record.company ?? null,
        title: record.profession,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: null,
        date: record.issueDate,
      },
      idempotencyKey: `license-disc-${record.boardName}-${record.licenseNumber}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}
