import type { FastifyInstance } from "fastify";

interface OutreachQueryParams {
  channel?: string;
  status?: string;
  leadId?: string;
  page?: number;
  limit?: number;
}

interface OutreachAttempt {
  id: string;
  leadId: string;
  channel: string;
  status: string;
  subject: string | null;
  sentAt: string;
  openedAt: string | null;
  repliedAt: string | null;
  bouncedAt: string | null;
  createdAt: string;
}

interface PaginatedOutreachResponse {
  data: OutreachAttempt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OutreachStats {
  totalSent: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  byChannel: {
    channel: string;
    sent: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
  }[];
}

interface OutreachStatsResponse {
  data: OutreachStats;
}

export async function outreachRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: OutreachQueryParams; Reply: PaginatedOutreachResponse }>(
    "/",
    async (request, _reply) => {
      const { channel, status, leadId, page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const where: Prisma.OutreachAttemptWhereInput = {};
      // if (channel) where.channel = channel;
      // if (status) where.status = status;
      // if (leadId) where.leadId = leadId;
      //
      // const [attempts, total] = await Promise.all([
      //   prisma.outreachAttempt.findMany({
      //     where,
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { sentAt: "desc" },
      //   }),
      //   prisma.outreachAttempt.count({ where }),
      // ]);

      const attempts: OutreachAttempt[] = [];
      const total = 0;

      void channel;
      void status;
      void leadId;

      return {
        data: attempts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );

  fastify.get<{ Reply: OutreachStatsResponse }>("/stats", async (_request, _reply) => {
    // TODO: Prisma query
    // Aggregate outreach attempt stats: open rates, reply rates, bounce rates
    // const totalSent = await prisma.outreachAttempt.count();
    // const opened = await prisma.outreachAttempt.count({ where: { openedAt: { not: null } } });
    // const replied = await prisma.outreachAttempt.count({ where: { repliedAt: { not: null } } });
    // const bounced = await prisma.outreachAttempt.count({ where: { bouncedAt: { not: null } } });

    const stats: OutreachStats = {
      totalSent: 0,
      openRate: 0,
      replyRate: 0,
      bounceRate: 0,
      byChannel: [],
    };

    return { data: stats };
  });
}
