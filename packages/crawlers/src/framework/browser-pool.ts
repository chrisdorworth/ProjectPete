import type { Browser, Page, BrowserContext } from "playwright";

const MAX_CONCURRENT = 4;
const RECYCLE_AFTER_PAGES = 50;

export class BrowserPool {
  private browser: Browser | null = null;
  private activePages = 0;
  private totalPages = 0;
  private waitQueue: Array<(page: Page) => void> = [];

  async initialize(): Promise<void> {
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
      ],
    });
  }

  async acquirePage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    if (this.totalPages >= RECYCLE_AFTER_PAGES) {
      await this.recycle();
    }

    if (this.activePages >= MAX_CONCURRENT) {
      return new Promise<Page>((resolve) => {
        this.waitQueue.push(resolve);
      });
    }

    this.activePages++;
    this.totalPages++;
    const context = await this.browser!.newContext({
      userAgent: "MeridianBot/1.0 (+https://meridian.example.com/bot)",
      viewport: { width: 1280, height: 720 },
    });
    return context.newPage();
  }

  async releasePage(page: Page): Promise<void> {
    const context = page.context();
    await page.close();
    await context.close();
    this.activePages--;

    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      this.activePages++;
      this.totalPages++;
      const ctx = await this.browser!.newContext();
      const newPage = await ctx.newPage();
      next(newPage);
    }
  }

  private async recycle(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    this.totalPages = 0;
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({ headless: true });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  get stats(): { active: number; total: number; queued: number } {
    return {
      active: this.activePages,
      total: this.totalPages,
      queued: this.waitQueue.length,
    };
  }
}

export const browserPool = new BrowserPool();
