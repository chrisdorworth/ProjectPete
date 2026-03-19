import type { FastifyInstance } from "fastify";
import { z } from "zod";

// Event emission handled by event store integration

const RequestEnrichmentSchema = z.object({
  leadId: z.string().uuid(),
  providers: z.array(z.string()).min(1),
  priority: z.enum(["low", "normal", "high"]),
});

const RetryEnrichmentSchema = z.object({
  leadId: z.string().uuid(),
  provider: z.string(),
  reason: z.string(),
});

export async function enrichmentHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/:leadId/request", async (request, reply) => {
    const result = RequestEnrichmentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:leadId/retry", async (request, reply) => {
    const result = RetryEnrichmentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
