import type { FastifyInstance } from "fastify";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  timestamp: string;
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: HealthResponse }>("/health", async (_request, _reply) => {
    return {
      status: "healthy",
      service: "query",
      timestamp: new Date().toISOString(),
    };
  });
}
