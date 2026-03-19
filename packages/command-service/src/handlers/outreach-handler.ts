import type { FastifyInstance } from "fastify";
import { GenerateDraftSchema } from "../middleware/validation.js";
import { z } from "zod";

// Event emission handled by event store integration

const QueueOutreachSchema = z.object({
  outreachId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  channel: z.enum(["email", "linkedin", "voicemail", "handwritten", "sms"]),
});

const SendOutreachSchema = z.object({
  outreachId: z.string().uuid(),
  channel: z.enum(["email", "linkedin", "voicemail", "handwritten", "sms"]),
  force: z.boolean().optional(),
});

export async function outreachHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/draft", async (request, reply) => {
    const result = GenerateDraftSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:id/queue", async (request, reply) => {
    const result = QueueOutreachSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:id/send", async (request, reply) => {
    const result = SendOutreachSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
