import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const PUBLIC_ROUTES = ["/command/health"];

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (PUBLIC_ROUTES.includes(request.url)) return;

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing authorization token" });
  }

  const token = authHeader.slice(7);
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    return reply.code(500).send({ error: "JWT_SECRET not configured" });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (request as FastifyRequest & { user: AuthPayload }).user = payload;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}
