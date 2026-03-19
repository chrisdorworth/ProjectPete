import robotsParser from "robots-parser";

type RobotsRules = ReturnType<typeof robotsParser>;
const robotsCache = new Map<string, { rules: RobotsRules; expiresAt: number }>();
const CACHE_TTL_MS = 3600_000; // 1 hour

export async function isAllowed(
  url: string,
  userAgent = "MeridianBot",
): Promise<boolean> {
  const urlObj = new URL(url);
  const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

  const cached = robotsCache.get(robotsUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rules.isAllowed(url, userAgent) ?? true;
  }

  try {
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return true; // No robots.txt → everything allowed
    }

    const text = await response.text();
    const rules = robotsParser(robotsUrl, text);

    robotsCache.set(robotsUrl, {
      rules,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return rules.isAllowed(url, userAgent) ?? true;
  } catch {
    return true; // Network error → assume allowed
  }
}

export function getCrawlDelay(host: string, userAgent = "MeridianBot"): number | null {
  const cached = robotsCache.get(`https://${host}/robots.txt`) ??
    robotsCache.get(`http://${host}/robots.txt`);

  if (!cached) return null;

  return cached.rules.getCrawlDelay(userAgent) ?? null;
}

export function clearCache(): void {
  robotsCache.clear();
}
