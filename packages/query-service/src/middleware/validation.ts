import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PAGE_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 50;

/**
 * Validate that a string is a valid UUID v1-v7.
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Clamp and sanitise pagination parameters from query strings.
 * Returns safe `page` and `limit` values.
 */
export function sanitizePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
} {
  let page = Number(query["page"]);
  let limit = Number(query["limit"]);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;

  return { page: Math.floor(page), limit: Math.floor(limit) };
}

/**
 * Register input-validation hooks on a Fastify instance.
 *
 * - Validates `:id` route params as UUIDs.
 * - Clamps pagination query params to safe bounds.
 * - Rejects mutation requests without application/json content-type.
 */
export async function registerValidation(app: FastifyInstance): Promise<void> {
  // Validate :id params are UUIDs
  app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as Record<string, unknown>;
    if (params && typeof params["id"] === "string") {
      if (!isValidUuid(params["id"])) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Parameter 'id' must be a valid UUID",
        });
      }
    }
  });

  // Sanitise pagination query params
  app.addHook("preHandler", async (request: FastifyRequest) => {
    const query = request.query as Record<string, unknown>;
    if (query && (query["page"] !== undefined || query["limit"] !== undefined)) {
      const { page, limit } = sanitizePagination(query);
      (request.query as Record<string, unknown>)["page"] = page;
      (request.query as Record<string, unknown>)["limit"] = limit;
    }
  });

  // Require application/json for mutation methods
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const contentType = request.headers["content-type"];
      if (!contentType?.includes("application/json")) {
        return reply.status(415).send({
          error: "Unsupported Media Type",
          message: "Content-Type must be application/json",
        });
      }
    }
  });
}
