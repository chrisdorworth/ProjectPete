import type { FastifyInstance } from "fastify";
import { RecordDispositionSchema } from "../middleware/validation.js";

// Event emission handled by event store integration

export async function dispositionHandler(fastify: FastifyInstance): Promise<void> {
  // Handles: meeting_booked, qualified, converted, disqualified, lost
  fastify.post("/", async (request, reply) => {
    const result = RecordDispositionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
