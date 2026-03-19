import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { leadsRoutes } from "./routes/leads.js";
import { leadDetailRoutes } from "./routes/lead-detail.js";
import { householdsRoutes } from "./routes/households.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { outreachRoutes } from "./routes/outreach.js";
import { graphRoutes } from "./routes/graph.js";
import { searchRoutes } from "./routes/search.js";
import { crawlersRoutes } from "./routes/crawlers.js";
import { complianceRoutes } from "./routes/compliance.js";
import { meetingPrepRoutes } from "./routes/meeting-prep.js";
import { territoryRoutes } from "./routes/territory.js";
import { healthRoutes } from "./routes/health.js";
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
    max: 200,
    timeWindow: "1 minute",
  });

  server.addHook("onRequest", authMiddleware);

  await server.register(healthRoutes, { prefix: "/query" });
  await server.register(leadsRoutes, { prefix: "/query/leads" });
  await server.register(leadDetailRoutes, { prefix: "/query/leads" });
  await server.register(householdsRoutes, { prefix: "/query/households" });
  await server.register(analyticsRoutes, { prefix: "/query/analytics" });
  await server.register(outreachRoutes, { prefix: "/query/outreach" });
  await server.register(graphRoutes, { prefix: "/query/graph" });
  await server.register(searchRoutes, { prefix: "/query/search" });
  await server.register(crawlersRoutes, { prefix: "/query/crawlers" });
  await server.register(complianceRoutes, { prefix: "/query/compliance" });
  await server.register(meetingPrepRoutes, { prefix: "/query/meeting-prep" });
  await server.register(territoryRoutes, { prefix: "/query/territory" });

  const port = parseInt(process.env["QUERY_PORT"] ?? "3002", 10);
  const host = process.env["HOST"] ?? "0.0.0.0";

  await server.listen({ port, host });
  server.log.info(`Query service listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start query service:", err);
  process.exit(1);
});

export default server;
