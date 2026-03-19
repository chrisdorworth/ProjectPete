import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  timestamp: string;
  checks?: Record<string, { status: string; message?: string }>;
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Liveness probe – indicates whether the process is running.
   * Returns 200 even when downstream dependencies are degraded so that
   * the orchestrator does not needlessly restart the container.
   */
  fastify.get<{ Reply: HealthResponse }>("/health", async (_request, _reply) => {
    const dbCheck = await checkDatabase();

    const status = dbCheck.ok ? "healthy" : "unhealthy";
    const httpCode = dbCheck.ok ? 200 : 503;

    _reply.code(httpCode);

    return {
      status,
      service: "query",
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbCheck.ok ? "up" : "down",
          ...(dbCheck.error && { message: dbCheck.error }),
        },
      },
    };
  });

  /**
   * Readiness probe – indicates whether the service is ready to accept
   * traffic.  Returns 503 when any critical dependency is unavailable so
   * that the load-balancer stops routing requests here.
   */
  fastify.get<{ Reply: HealthResponse }>("/ready", async (_request, reply) => {
    const dbCheck = await checkDatabase();

    if (!dbCheck.ok) {
      reply.code(503);
      return {
        status: "unhealthy",
        service: "query",
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "down", message: dbCheck.error },
        },
      };
    }

    return {
      status: "healthy",
      service: "query",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "up" },
      },
    };
  });
}

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: message };
  }
}
