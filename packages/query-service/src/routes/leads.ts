import type { FastifyInstance } from "fastify";

interface LeadsQueryParams {
  status?: string;
  minScore?: number;
  maxScore?: number;
  county?: string;
  assignedRepId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface Lead {
  id: string;
  name: string;
  status: string;
  compositeScore: number;
  county: string;
  assignedRepId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedLeadsResponse {
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function leadsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: LeadsQueryParams; Reply: PaginatedLeadsResponse }>(
    "/",
    async (request, _reply) => {
      const {
        status,
        minScore,
        maxScore,
        county,
        assignedRepId,
        page = 1,
        limit = 50,
        sortBy = "compositeScore",
        sortOrder = "desc",
      } = request.query;

      // TODO: Prisma query
      // const where: Prisma.LeadWhereInput = {};
      // if (status) where.status = status;
      // if (minScore !== undefined || maxScore !== undefined) {
      //   where.compositeScore = {
      //     ...(minScore !== undefined && { gte: minScore }),
      //     ...(maxScore !== undefined && { lte: maxScore }),
      //   };
      // }
      // if (county) where.county = county;
      // if (assignedRepId) where.assignedRepId = assignedRepId;
      //
      // const [leads, total] = await Promise.all([
      //   prisma.lead.findMany({
      //     where,
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { [sortBy]: sortOrder },
      //   }),
      //   prisma.lead.count({ where }),
      // ]);

      const leads: Lead[] = [];
      const total = 0;

      void status;
      void minScore;
      void maxScore;
      void county;
      void assignedRepId;
      void sortBy;
      void sortOrder;

      return {
        data: leads,
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
