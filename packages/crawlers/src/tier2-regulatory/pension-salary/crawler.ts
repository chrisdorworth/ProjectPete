import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface SalaryRecord {
  employeeName: string;
  agency: string;
  title: string;
  annualSalary: number;
  hireDate: string;
  separationDate?: string;
  county?: string;
  retirementSystem?: string;
  yearsOfService?: number;
}

interface PensionRecord {
  memberName: string;
  agency: string;
  retirementPlan: string;
  monthlyBenefit: number;
  effectiveDate: string;
  yearsOfService: number;
  county?: string;
}

const HIGH_SALARY_THRESHOLD_CENTS = 150_000_00n; // $150,000
const PENSION_ELIGIBLE_YEARS = 25;

const FL_SALARY_SOURCES = [
  {
    name: "FL People First",
    url: "https://data.florida.gov/resource/state-employee-salary.json",
    type: "salary" as const,
  },
  {
    name: "FL Retirement System",
    url: "https://data.florida.gov/resource/frs-retiree-benefits.json",
    type: "pension" as const,
  },
  {
    name: "FL SUS Salary",
    url: "https://data.florida.gov/resource/sus-employee-salary.json",
    type: "salary" as const,
  },
] as const;

export class PensionSalaryCrawler extends BaseCrawler {
  private readonly appToken: string | null;

  constructor(
    appToken: string | null = null,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "fl-pension-salary",
      tier: 2,
      maxConcurrentPages: 2,
      requestDelayMs: 1500,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
    this.appToken = appToken;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const source of FL_SALARY_SOURCES) {
      if (source.type === "salary") {
        const records = await this.fetchSalaryRecords(source.url);
        for (const record of records) {
          const salCents = BigInt(Math.round(record.annualSalary * 100));
          if (salCents >= HIGH_SALARY_THRESHOLD_CENTS) {
            signals.push(this.toHighSalarySignal(record, source.name));
          }
          if (record.separationDate) {
            signals.push(this.toJobChangeSignal(record, source.name));
          }
        }
      } else {
        const records = await this.fetchPensionRecords(source.url);
        for (const record of records) {
          if (record.yearsOfService >= PENSION_ELIGIBLE_YEARS) {
            signals.push(this.toPensionSignal(record, source.name));
          }
        }
      }
      await this.delay();
    }

    return signals;
  }

  private async fetchSalaryRecords(baseUrl: string): Promise<SalaryRecord[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const dateFilter = thirtyDaysAgo.toISOString().slice(0, 10);

    return this.retryWithBackoff(async () => {
      const url = new URL(baseUrl);
      url.searchParams.set("$where", `annual_salary > 150000 OR separation_date > '${dateFilter}'`);
      url.searchParams.set("$limit", "500");
      url.searchParams.set("$order", "annual_salary DESC");
      if (this.appToken) {
        url.searchParams.set("$$app_token", this.appToken);
      }

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": this.config.userAgent },
      });
      if (!res.ok) {
        throw new Error(`Salary fetch failed: ${res.status}`);
      }

      const raw = (await res.json()) as Record<string, string>[];
      return raw.map((r) => ({
        employeeName: r.employee_name ?? r.name ?? "Unknown",
        agency: r.agency ?? r.department ?? "Unknown",
        title: r.class_title ?? r.position_title ?? "Unknown",
        annualSalary: parseFloat(r.annual_salary ?? r.salary ?? "0"),
        hireDate: r.hire_date ?? "",
        separationDate: r.separation_date ?? undefined,
        county: r.county ?? undefined,
      }));
    });
  }

  private async fetchPensionRecords(baseUrl: string): Promise<PensionRecord[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const dateFilter = thirtyDaysAgo.toISOString().slice(0, 10);

    return this.retryWithBackoff(async () => {
      const url = new URL(baseUrl);
      url.searchParams.set("$where", `effective_date > '${dateFilter}'`);
      url.searchParams.set("$limit", "500");
      url.searchParams.set("$order", "monthly_benefit DESC");
      if (this.appToken) {
        url.searchParams.set("$$app_token", this.appToken);
      }

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": this.config.userAgent },
      });
      if (!res.ok) {
        throw new Error(`Pension fetch failed: ${res.status}`);
      }

      const raw = (await res.json()) as Record<string, string>[];
      return raw.map((r) => ({
        memberName: r.member_name ?? r.name ?? "Unknown",
        agency: r.agency ?? r.employer ?? "Unknown",
        retirementPlan: r.plan ?? r.retirement_plan ?? "FRS",
        monthlyBenefit: parseFloat(r.monthly_benefit ?? "0"),
        effectiveDate: r.effective_date ?? "",
        yearsOfService: parseFloat(r.years_of_service ?? "0"),
        county: r.county ?? undefined,
      }));
    });
  }

  private toHighSalarySignal(record: SalaryRecord, sourceName: string): ExtractedSignal {
    const salCents = BigInt(Math.round(record.annualSalary * 100));
    return {
      signalType: SignalTypes.HIGH_SALARY satisfies SignalType,
      source: sourceName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.6,
      rawData: { ...record },
      extractedData: {
        name: record.employeeName,
        company: record.agency,
        title: record.title,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: salCents.toString(),
        date: record.hireDate,
      },
      idempotencyKey: `salary-${sourceName}-${record.employeeName}-${record.agency}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  private toJobChangeSignal(record: SalaryRecord, sourceName: string): ExtractedSignal {
    return {
      signalType: SignalTypes.PROFESSIONAL_RETIREMENT satisfies SignalType,
      source: sourceName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.55,
      rawData: { ...record },
      extractedData: {
        name: record.employeeName,
        company: record.agency,
        title: record.title,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: null,
        date: record.separationDate ?? null,
      },
      idempotencyKey: `separation-${sourceName}-${record.employeeName}-${record.separationDate}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }

  private toPensionSignal(record: PensionRecord, sourceName: string): ExtractedSignal {
    const monthlyBenefitCents = BigInt(Math.round(record.monthlyBenefit * 100));
    return {
      signalType: SignalTypes.PENSION_ELIGIBLE satisfies SignalType,
      source: sourceName,
      sourceUrl: null,
      sourceTier: 2,
      confidence: 0.75,
      rawData: { ...record },
      extractedData: {
        name: record.memberName,
        company: record.agency,
        title: null,
        county: record.county ?? null,
        state: "FL",
        estimatedValueCents: monthlyBenefitCents.toString(),
        date: record.effectiveDate,
      },
      idempotencyKey: `pension-${sourceName}-${record.memberName}-${record.effectiveDate}`.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}
