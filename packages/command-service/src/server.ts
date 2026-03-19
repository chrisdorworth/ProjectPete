import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { signalHandler } from "./handlers/signal-handler.js";
import { leadHandler } from "./handlers/lead-handler.js";
import { enrichmentHandler } from "./handlers/enrichment-handler.js";
import { scoringHandler } from "./handlers/scoring-handler.js";
import { outreachHandler } from "./handlers/outreach-handler.js";
import { dispositionHandler } from "./handlers/disposition-handler.js";
import { complianceHandler } from "./handlers/compliance-handler.js";
import { authMiddleware } from "./middleware/auth.js";

const server = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
  },
});

async function start(): Promise<void> {
  await server.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
    credentials: true,
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  server.addHook("onRequest", authMiddleware);

  await server.register(signalHandler, { prefix: "/command/signals" });
  await server.register(leadHandler, { prefix: "/command/leads" });
  await server.register(enrichmentHandler, { prefix: "/command/enrichment" });
  await server.register(scoringHandler, { prefix: "/command/scoring" });
  await server.register(outreachHandler, { prefix: "/command/outreach" });
  await server.register(dispositionHandler, { prefix: "/command/dispositions" });
  await server.register(complianceHandler, { prefix: "/command/compliance" });

  server.get("/command/health", async () => ({
    status: "healthy",
    service: "command",
    timestamp: new Date().toISOString(),
  }));

  const port = parseInt(process.env["PORT"] ?? "3001", 10);
  const host = process.env["HOST"] ?? "0.0.0.0";

  await server.listen({ port, host });
  server.log.info(`Command service listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start command service:", err);
  process.exit(1);
});

export default server;
