import type { FastifyInstance } from "fastify";

interface PaginationQueryParams {
  page?: number;
  limit?: number;
}

interface SuppressionEntry {
  id: string;
  type: "email" | "phone" | "address" | "person";
  value: string;
  reason: string;
  source: string;
  addedAt: string;
  expiresAt: string | null;
}

interface SuppressionResponse {
  data: SuppressionEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  occurredAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ComplianceReview {
  id: string;
  leadId: string;
  leadName: string;
  reviewType: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  submittedBy: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

interface ReviewQueueResponse {
  data: ComplianceReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function complianceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: PaginationQueryParams; Reply: SuppressionResponse }>(
    "/suppression",
    async (request, _reply) => {
      const { page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const [entries, total] = await Promise.all([
      //   prisma.suppressionEntry.findMany({
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { addedAt: "desc" },
      //   }),
      //   prisma.suppressionEntry.count(),
      // ]);

      const entries: SuppressionEntry[] = [];
      const total = 0;

      return {
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );

  fastify.get<{ Querystring: PaginationQueryParams; Reply: AuditLogResponse }>(
    "/audit",
    async (request, _reply) => {
      const { page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const [entries, total] = await Promise.all([
      //   prisma.auditLog.findMany({
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { occurredAt: "desc" },
      //   }),
      //   prisma.auditLog.count(),
      // ]);

      const entries: AuditLogEntry[] = [];
      const total = 0;

      return {
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );

  fastify.get<{ Querystring: PaginationQueryParams; Reply: ReviewQueueResponse }>(
    "/review-queue",
    async (request, _reply) => {
      const { page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const [reviews, total] = await Promise.all([
      //   prisma.complianceReview.findMany({
      //     where: { status: "pending" },
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { submittedAt: "desc" },
      //     include: { lead: { select: { name: true } } },
      //   }),
      //   prisma.complianceReview.count({ where: { status: "pending" } }),
      // ]);

      const reviews: ComplianceReview[] = [];
      const total = 0;

      return {
        data: reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );
}
