import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function registerSecurityHeaders(app: FastifyInstance): Promise<void> {
  app.addHook("onSend", async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0");
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    reply.header("Cache-Control", "no-store");
    reply.header("Pragma", "no-cache");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

export function validateContentType(request: FastifyRequest, reply: FastifyReply): boolean {
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    const contentType = request.headers["content-type"];
    if (!contentType?.includes("application/json")) {
      reply.status(415).send({ error: "Unsupported Media Type. Use application/json" });
      return false;
    }
  }
  return true;
}

export function createCsrfProtection() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
      return;
    }

    const origin = request.headers.origin;
    const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "").split(",").filter(Boolean);

    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return reply.status(403).send({ error: "CSRF: Origin not allowed" });
    }
  };
}
