// Rate limiting is configured via @fastify/rate-limit plugin in server.ts
// This file exports additional per-route rate limit configs

export const RATE_LIMITS = {
  crawl: { max: 10, timeWindow: "1 minute" },
  enrich: { max: 50, timeWindow: "1 minute" },
  outreach: { max: 20, timeWindow: "1 minute" },
  score: { max: 100, timeWindow: "1 minute" },
  compliance: { max: 50, timeWindow: "1 minute" },
  default: { max: 100, timeWindow: "1 minute" },
} as const;
