import type { FastifyInstance } from "fastify";
import { ScoreLeadSchema } from "../middleware/validation.js";
import { z } from "zod";

// Event emission handled by event store integration

const RescoreLeadSchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string(),
  scoringMethod: z.enum(["rule_based", "ml_ensemble"]),
});

const OverrideScoreSchema = z.object({
  leadId: z.string().uuid(),
  overrideScore: z.number().min(0).max(100),
  reason: z.string(),
  overriddenBy: z.string().uuid(),
});

export async function scoringHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/:leadId/score", async (request, reply) => {
    const result = ScoreLeadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:leadId/rescore", async (request, reply) => {
    const result = RescoreLeadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:leadId/override", async (request, reply) => {
    const result = OverrideScoreSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
