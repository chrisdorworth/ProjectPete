import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface SocialPost {
  postId: string;
  platform: "facebook" | "twitter" | "instagram" | "threads";
  authorName: string;
  authorHandle: string;
  authorProfileUrl: string;
  content: string;
  postedAt: string;
  location: string | null;
  likeCount: number;
  shareCount: number;
  isPublic: boolean;
}

interface SocialApiConfig {
  apiKey: string;
  baseUrl: string;
  maxRequestsPerHour: number;
}

interface ClassifiedPost {
  signalType: SignalType;
  confidence: number;
  lifeEventType: string;
}

const RETIREMENT_PATTERNS = [
  /\bretir(?:ed|ing|ement)\b/i,
  /\blast\s+day\s+(?:at\s+work|in\s+the\s+office)\b/i,
  /\bhanging\s+up\s+(?:my|the)\b/i,
  /\bclosing\s+this\s+chapter\b/i,
  /\b(?:30|35|40)\+?\s+years?\s+(?:in|of|at)\b/i,
  /\bgold(?:en)?\s+watch\b/i,
  /\bfarewell\s+to\s+(?:my\s+)?colleagues\b/i,
];

const ENGAGEMENT_PATTERNS = [
  /\b(?:she|he)\s+said\s+yes\b/i,
  /\bengaged\b/i,
  /\bpropos(?:ed|al)\b/i,
  /\bsaid\s+yes\b/i,
  /\bput\s+a\s+ring\b/i,
  /\bfianc[eé][e]?\b/i,
];

const BABY_PATTERNS = [
  /\b(?:baby|newborn|born)\b/i,
  /\bpregnant\b/i,
  /\bexpecting\b/i,
  /\bwelcome(?:d)?\s+(?:our|a|baby)\b/i,
  /\bit'?s\s+a\s+(?:boy|girl)\b/i,
  /\bnew\s+(?:dad|mom|parent)\b/i,
];

const BUSINESS_SALE_PATTERNS = [
  /\bsold\s+(?:my|our|the)\s+(?:business|company|practice)\b/i,
  /\bexited\s+(?:my|our)\b/i,
  /\bacquisition\s+(?:of|is)\s+(?:complete|done|final)\b/i,
  /\bnew\s+chapter\s+after\s+selling\b/i,
];

const FL_LOCATIONS = [
  "florida",
  "fl",
  "miami",
  "orlando",
  "tampa",
  "jacksonville",
  "fort lauderdale",
  "naples",
  "sarasota",
  "st. petersburg",
  "west palm beach",
  "boca raton",
];

export class SocialCrawler extends BaseCrawler {
  private readonly socialConfig: SocialApiConfig;
  private requestsThisHour = 0;
  private hourResetAt = 0;

  constructor(
    socialConfig: SocialApiConfig,
    configOverrides: Partial<CrawlerConfig> = {},
  ) {
    super({
      name: "social-life-events",
      tier: 4,
      maxConcurrentPages: 1,
      requestDelayMs: 2000,
      maxRetries: 2,
      circuitBreakerThreshold: 3,
      respectRobotsTxt: false, // API-based
      ...configOverrides,
    });
    this.socialConfig = socialConfig;
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    this.resetHourlyCounterIfNeeded();

    const signals: ExtractedSignal[] = [];
    const keywords = [
      "retired",
      "retirement",
      "sold my business",
      "last day at work",
      "new chapter",
    ];

    for (const keyword of keywords) {
      if (this.requestsThisHour >= this.socialConfig.maxRequestsPerHour) {
        break;
      }

      const posts = await this.searchPublicPosts(keyword);

      for (const post of posts) {
        if (!post.isPublic) continue;
        if (!this.isFloridaLocation(post.location)) continue;

        const classified = this.classifyPost(post);
        if (classified) {
          signals.push(this.toSignal(post, classified));
        }
      }

      this.requestsThisHour++;
      await this.delay();
    }

    return signals;
  }

  private resetHourlyCounterIfNeeded(): void {
    const now = Date.now();
    if (now >= this.hourResetAt) {
      this.requestsThisHour = 0;
      this.hourResetAt = now + 3_600_000;
    }
  }

  private async searchPublicPosts(keyword: string): Promise<SocialPost[]> {
    return this.retryWithBackoff(async () => {
      const url = new URL(`${this.socialConfig.baseUrl}/v1/search/posts`);
      url.searchParams.set("q", keyword);
      url.searchParams.set("visibility", "public");
      url.searchParams.set("location", "Florida");
      url.searchParams.set("since", new Date(Date.now() - 86_400_000).toISOString());
      url.searchParams.set("limit", "100");

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.socialConfig.apiKey}`,
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 429) {
          this.requestsThisHour = this.socialConfig.maxRequestsPerHour;
          return [];
        }
        throw new Error(`Social search failed: ${res.status}`);
      }

      const data = (await res.json()) as { posts: Record<string, unknown>[] };
      return (data.posts ?? [])
        .map((p) => ({
          postId: String(p.postId ?? p.id ?? ""),
          platform: this.normalizePlatform(String(p.platform ?? "")),
          authorName: String(p.authorName ?? p.name ?? ""),
          authorHandle: String(p.authorHandle ?? p.handle ?? ""),
          authorProfileUrl: String(p.authorProfileUrl ?? p.profileUrl ?? ""),
          content: String(p.content ?? p.text ?? p.body ?? ""),
          postedAt: String(p.postedAt ?? p.createdAt ?? p.date ?? ""),
          location: p.location ? String(p.location) : null,
          likeCount: Number(p.likeCount ?? p.likes ?? 0),
          shareCount: Number(p.shareCount ?? p.shares ?? 0),
          isPublic: p.isPublic !== false,
        }))
        .filter((p) => p.isPublic);
    });
  }

  private normalizePlatform(
    raw: string,
  ): "facebook" | "twitter" | "instagram" | "threads" {
    const lower = raw.toLowerCase();
    if (lower.includes("facebook") || lower === "fb") return "facebook";
    if (lower.includes("instagram") || lower === "ig") return "instagram";
    if (lower.includes("threads")) return "threads";
    return "twitter";
  }

  private isFloridaLocation(location: string | null): boolean {
    if (!location) return false;
    const lower = location.toLowerCase();
    return FL_LOCATIONS.some((loc) => lower.includes(loc));
  }

  private classifyPost(post: SocialPost): ClassifiedPost | null {
    const text = post.content;

    if (RETIREMENT_PATTERNS.some((p) => p.test(text))) {
      return {
        signalType: SignalTypes.SOCIAL_RETIREMENT_POST,
        confidence: 0.55,
        lifeEventType: "retirement",
      };
    }

    if (BUSINESS_SALE_PATTERNS.some((p) => p.test(text))) {
      return {
        signalType: SignalTypes.SOCIAL_LIFE_EVENT,
        confidence: 0.5,
        lifeEventType: "business_sale",
      };
    }

    if (ENGAGEMENT_PATTERNS.some((p) => p.test(text))) {
      return {
        signalType: SignalTypes.SOCIAL_LIFE_EVENT,
        confidence: 0.4,
        lifeEventType: "engagement",
      };
    }

    if (BABY_PATTERNS.some((p) => p.test(text))) {
      return {
        signalType: SignalTypes.SOCIAL_LIFE_EVENT,
        confidence: 0.35,
        lifeEventType: "new_child",
      };
    }

    return null;
  }

  private toSignal(post: SocialPost, classified: ClassifiedPost): ExtractedSignal {
    return {
      signalType: classified.signalType,
      source: `social-${post.platform}`,
      sourceUrl: post.authorProfileUrl || null,
      sourceTier: 4,
      confidence: classified.confidence,
      rawData: {
        postId: post.postId,
        platform: post.platform,
        content: post.content.slice(0, 500),
        likeCount: post.likeCount,
        shareCount: post.shareCount,
        lifeEventType: classified.lifeEventType,
      },
      extractedData: {
        name: post.authorName,
        company: null,
        title: null,
        county: null,
        state: "FL",
        estimatedValueCents: null,
        date: post.postedAt,
      },
      idempotencyKey: `social-${post.platform}-${post.postId}`,
    };
  }
}
