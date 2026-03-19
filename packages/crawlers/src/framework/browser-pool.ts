import type { Browser, Page, BrowserContext } from "playwright";

const MAX_CONCURRENT = 4;
const RECYCLE_AFTER_PAGES = 50;
const USER_AGENT = "MeridianBot/1.0 (+https://meridian.example.com/bot)";

const LAUNCH_ARGS = [
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-gpu",
];

export class BrowserPool {
  private browser: Browser | null = null;
  private activePages = 0;
  private totalPages = 0;
  private waitQueue: Array<(page: Page) => void> = [];

  async initialize(): Promise<void> {
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({
      headless: true,
      args: LAUNCH_ARGS,
    });
  }

  async acquirePage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    // Only recycle when no pages are in-flight; otherwise defer to next opportunity
    if (this.totalPages >= RECYCLE_AFTER_PAGES && this.activePages === 0) {
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
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 },
    });
    return context.newPage();
  }

  async releasePage(page: Page): Promise<void> {
    const context = page.context();
    await page.close();
    await context.close();
    this.activePages--;

    // If recycle threshold reached and this was the last active page, recycle now
    if (this.totalPages >= RECYCLE_AFTER_PAGES && this.activePages === 0) {
      await this.recycle();
      return;
    }

    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      this.activePages++;
      this.totalPages++;
      const ctx = await this.browser!.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1280, height: 720 },
      });
      const newPage = await ctx.newPage();
      next(newPage);
    }
  }

  private async recycle(): Promise<void> {
    // Safety: never recycle while pages are still active
    if (this.activePages > 0) {
      return;
    }

    // Drain the wait queue so waiters don't resolve against a closed browser
    const pendingWaiters = this.waitQueue.splice(0);

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Browser may already be disconnected; continue with relaunch
      }
      this.browser = null;
    }

    this.totalPages = 0;

    // Relaunch with the same launch args used in initialize()
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({
      headless: true,
      args: LAUNCH_ARGS,
    });

    // Fulfil pending waiters with pages from the fresh browser
    for (const waiter of pendingWaiters) {
      this.activePages++;
      this.totalPages++;
      const ctx = await this.browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1280, height: 720 },
      });
      const newPage = await ctx.newPage();
      waiter(newPage);
    }
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
