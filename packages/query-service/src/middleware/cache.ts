import type { FastifyRequest, FastifyReply } from "fastify";
import Redis from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379");
  }
  return redis;
}

export async function cacheMiddleware(
  ttlSeconds: number,
): Promise<(request: FastifyRequest, reply: FastifyReply) => Promise<void>> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `cache:${request.url}`;
    const r = getRedis();

    const cached = await r.get(key);
    if (cached) {
      return reply
        .header("X-Cache", "HIT")
        .type("application/json")
        .send(cached);
    }

    const originalSend = reply.send.bind(reply);
    reply.send = function (payload: unknown) {
      const body = typeof payload === "string" ? payload : JSON.stringify(payload);
      r.setex(key, ttlSeconds, body).catch(() => {});
      reply.header("X-Cache", "MISS");
      return originalSend(payload);
    } as typeof reply.send;
  };
}
