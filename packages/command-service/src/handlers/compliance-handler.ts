import type { FastifyInstance } from "fastify";
import { ExportDataSchema, PurgeDataSchema } from "../middleware/validation.js";
import { z } from "zod";

// Event emission handled by event store integration

const ReviewComplianceSchema = z.object({
  outreachId: z.string().uuid(),
  reviewType: z.enum(["pre_send", "post_send", "audit"]),
  reviewedBy: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().nullable(),
});

export async function complianceHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/:outreachId/review", async (request, reply) => {
    const result = ReviewComplianceSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/export", async (request, reply) => {
    const result = ExportDataSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/purge", async (request, reply) => {
    const result = PurgeDataSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
