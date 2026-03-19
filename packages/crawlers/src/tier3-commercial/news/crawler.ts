import { SignalTypes, type SignalType } from "@meridian/domain";
import {
  BaseCrawler,
  type ExtractedSignal,
  type CrawlerConfig,
} from "../../framework/base-crawler.js";

interface RssFeedSource {
  name: string;
  feedUrl: string;
  region: string;
}

interface ArticleItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  source: string;
}

interface ExtractedArticleSignal {
  signalType: SignalType;
  personName: string | null;
  companyName: string | null;
  title: string | null;
  estimatedValueCents: bigint | null;
  county: string | null;
  confidence: number;
}

const NEWS_FEEDS: RssFeedSource[] = [
  {
    name: "Orlando Sentinel Business",
    feedUrl: "https://www.orlandosentinel.com/business/feed/",
    region: "Central FL",
  },
  {
    name: "Orlando Business Journal",
    feedUrl: "https://feeds.bizjournals.com/bizj_orlando",
    region: "Central FL",
  },
  {
    name: "Tampa Bay Times Business",
    feedUrl: "https://www.tampabay.com/news/business/feed/",
    region: "Tampa Bay",
  },
  {
    name: "South FL Business Journal",
    feedUrl: "https://feeds.bizjournals.com/bizj_southflorida",
    region: "South FL",
  },
];

const ACQUISITION_PATTERNS = [
  /\bacquir(?:ed|es|ing|ition)\b/i,
  /\bmerge[drs]?\b/i,
  /\bbought\s+(?:out|by)\b/i,
  /\btakeover\b/i,
  /\bbuyout\b/i,
];

const EXECUTIVE_PATTERNS = [
  /\bnamed\s+(?:CEO|CFO|COO|CTO|president|chairman)\b/i,
  /\bappointed\s+(?:as\s+)?(?:CEO|CFO|COO|CTO|president|chairman)\b/i,
  /\bstep(?:ped|ping)\s+down\b/i,
  /\bretir(?:ed|ing|ement)\b/i,
  /\bresign(?:ed|ing|ation)\b/i,
];

const FUNDRAISING_PATTERNS = [
  /\braised\s+\$[\d,.]+\s*(?:million|billion|M|B)\b/i,
  /\bseries\s+[A-F]\b/i,
  /\bfunding\s+round\b/i,
  /\bIPO\b/i,
  /\bventure\s+capital\b/i,
];

const REAL_ESTATE_PATTERNS = [
  /\bsold\s+for\s+\$[\d,.]+/i,
  /\bacquired\s+(?:the\s+)?(?:property|building|complex|plaza|tower)/i,
  /\breal\s+estate\s+(?:deal|transaction|sale)\b/i,
];

const DOLLAR_PATTERN = /\$\s*([\d,.]+)\s*(million|billion|M|B|thousand|K)?/i;

export class NewsCrawler extends BaseCrawler {
  constructor(configOverrides: Partial<CrawlerConfig> = {}) {
    super({
      name: "fl-local-news",
      tier: 3,
      maxConcurrentPages: 3,
      requestDelayMs: 1500,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      respectRobotsTxt: true,
      ...configOverrides,
    });
  }

  protected async crawl(): Promise<ExtractedSignal[]> {
    const signals: ExtractedSignal[] = [];

    for (const feed of NEWS_FEEDS) {
      const articles = await this.fetchRssFeed(feed);

      for (const article of articles) {
        const extracted = this.classifyArticle(article);
        for (const sig of extracted) {
          signals.push(this.toSignal(sig, article));
        }
      }

      await this.delay();
    }

    return signals;
  }

  private async fetchRssFeed(feed: RssFeedSource): Promise<ArticleItem[]> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(feed.feedUrl, {
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      if (!res.ok) {
        throw new Error(`RSS fetch failed for ${feed.name}: ${res.status}`);
      }

      const xml = await res.text();
      return this.parseRssXml(xml, feed.name);
    });
  }

  private parseRssXml(xml: string, source: string): ArticleItem[] {
    const items: ArticleItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]!;
      items.push({
        title: this.extractTag(itemXml, "title"),
        link: this.extractTag(itemXml, "link"),
        pubDate: this.extractTag(itemXml, "pubDate"),
        description: this.stripHtml(this.extractTag(itemXml, "description")),
        content: this.stripHtml(
          this.extractTag(itemXml, "content:encoded") ||
            this.extractTag(itemXml, "description"),
        ),
        source,
      });
    }

    // Only return articles from the last 24 hours
    const cutoff = Date.now() - 86_400_000;
    return items.filter((item) => {
      const pubTime = new Date(item.pubDate).getTime();
      return !isNaN(pubTime) && pubTime >= cutoff;
    });
  }

  private extractTag(xml: string, tag: string): string {
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1]!;

    const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const simpleMatch = simpleRegex.exec(xml);
    return simpleMatch?.[1]?.trim() ?? "";
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  private classifyArticle(article: ArticleItem): ExtractedArticleSignal[] {
    const text = `${article.title} ${article.description} ${article.content}`;
    const results: ExtractedArticleSignal[] = [];
    const dollarAmount = this.extractDollarAmount(text);

    if (ACQUISITION_PATTERNS.some((p) => p.test(text))) {
      results.push({
        signalType: SignalTypes.NEWS_ACQUISITION,
        personName: null,
        companyName: this.extractCompanyName(text),
        title: null,
        estimatedValueCents: dollarAmount,
        county: null,
        confidence: 0.65,
      });
    }

    if (EXECUTIVE_PATTERNS.some((p) => p.test(text))) {
      results.push({
        signalType: SignalTypes.NEWS_EXECUTIVE_CHANGE,
        personName: this.extractPersonName(text),
        companyName: this.extractCompanyName(text),
        title: this.extractExecutiveTitle(text),
        estimatedValueCents: null,
        county: null,
        confidence: 0.6,
      });
    }

    if (FUNDRAISING_PATTERNS.some((p) => p.test(text))) {
      results.push({
        signalType: SignalTypes.NEWS_LIQUIDITY_EVENT,
        personName: null,
        companyName: this.extractCompanyName(text),
        title: null,
        estimatedValueCents: dollarAmount,
        county: null,
        confidence: 0.6,
      });
    }

    if (REAL_ESTATE_PATTERNS.some((p) => p.test(text))) {
      results.push({
        signalType: SignalTypes.COMMERCIAL_RE_SALE,
        personName: null,
        companyName: this.extractCompanyName(text),
        title: null,
        estimatedValueCents: dollarAmount,
        county: null,
        confidence: 0.55,
      });
    }

    return results;
  }

  private extractDollarAmount(text: string): bigint | null {
    const match = DOLLAR_PATTERN.exec(text);
    if (!match) return null;

    const numStr = match[1]!.replace(/,/g, "");
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;

    const multiplierStr = match[2]?.toLowerCase();
    let multiplier = 1;
    if (multiplierStr === "billion" || multiplierStr === "b") {
      multiplier = 1_000_000_000;
    } else if (multiplierStr === "million" || multiplierStr === "m") {
      multiplier = 1_000_000;
    } else if (multiplierStr === "thousand" || multiplierStr === "k") {
      multiplier = 1_000;
    }

    return BigInt(Math.round(num * multiplier * 100));
  }

  private extractCompanyName(text: string): string | null {
    // Heuristic: look for capitalized multi-word names near keywords
    const patterns = [
      /(?:by|from|to|at)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}(?:\s+(?:Inc|LLC|Corp|Co|Group|Holdings|Partners|Capital)\.?))/,
      /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}(?:\s+(?:Inc|LLC|Corp|Co|Group|Holdings|Partners|Capital))\.?)/,
    ];
    for (const p of patterns) {
      const match = p.exec(text);
      if (match) return match[1]!.trim();
    }
    return null;
  }

  private extractPersonName(text: string): string | null {
    const pattern = /(?:named|appointed|CEO|president|chairman)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i;
    const match = pattern.exec(text);
    return match?.[1] ?? null;
  }

  private extractExecutiveTitle(text: string): string | null {
    const pattern = /\b(CEO|CFO|COO|CTO|president|chairman|chief\s+\w+\s+officer)\b/i;
    const match = pattern.exec(text);
    return match?.[1] ?? null;
  }

  private toSignal(extracted: ExtractedArticleSignal, article: ArticleItem): ExtractedSignal {
    return {
      signalType: extracted.signalType,
      source: article.source,
      sourceUrl: article.link,
      sourceTier: 3,
      confidence: extracted.confidence,
      rawData: {
        title: article.title,
        pubDate: article.pubDate,
        description: article.description,
      },
      extractedData: {
        name: extracted.personName,
        company: extracted.companyName,
        title: extracted.title,
        county: extracted.county,
        state: "FL",
        estimatedValueCents: extracted.estimatedValueCents?.toString() ?? null,
        date: article.pubDate,
      },
      idempotencyKey: `news-${extracted.signalType}-${Buffer.from(article.link).toString("base64url").slice(0, 32)}`,
    };
  }
}
