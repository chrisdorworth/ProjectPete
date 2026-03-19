import type { FastifyInstance } from "fastify";
import { DetectSignalSchema } from "../middleware/validation.js";
import { z } from "zod";

// Event emission handled by event store integration

const ValidateSignalSchema = z.object({
  signalId: z.string().uuid(),
  validationRules: z.array(z.string()).min(1),
});

export async function signalHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/", async (request, reply) => {
    const result = DetectSignalSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:id/validate", async (request, reply) => {
    const result = ValidateSignalSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
