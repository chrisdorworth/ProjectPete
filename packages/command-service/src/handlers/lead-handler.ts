import type { FastifyInstance } from "fastify";
import {
  CreateLeadSchema,
  MergeLeadsSchema,
  AssignLeadSchema,
  SuppressLeadSchema,
} from "../middleware/validation.js";

// Event emission handled by event store integration

export async function leadHandler(fastify: FastifyInstance): Promise<void> {
  fastify.post("/", async (request, reply) => {
    const result = CreateLeadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/merge", async (request, reply) => {
    const result = MergeLeadsSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:id/assign", async (request, reply) => {
    const result = AssignLeadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });

  fastify.post("/:id/suppress", async (request, reply) => {
    const result = SuppressLeadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.message });
    }
    return reply.code(202).send({ ok: true });
  });
}
