import type { FastifyInstance } from "fastify";

interface HouseholdsQueryParams {
  page?: number;
  limit?: number;
}

interface HouseholdDetailParams {
  id: string;
}

interface HouseholdMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  compositeScore: number;
  status: string;
}

interface Household {
  id: string;
  address: string;
  county: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface HouseholdDetail extends Household {
  members: HouseholdMember[];
}

interface PaginatedHouseholdsResponse {
  data: Household[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface HouseholdDetailResponse {
  data: HouseholdDetail | null;
}

export async function householdsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: HouseholdsQueryParams; Reply: PaginatedHouseholdsResponse }>(
    "/",
    async (request, _reply) => {
      const { page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const [households, total] = await Promise.all([
      //   prisma.household.findMany({
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     include: { _count: { select: { members: true } } },
      //   }),
      //   prisma.household.count(),
      // ]);

      const households: Household[] = [];
      const total = 0;

      return {
        data: households,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );

  fastify.get<{ Params: HouseholdDetailParams; Reply: HouseholdDetailResponse }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;

      // TODO: Prisma query
      // const household = await prisma.household.findUnique({
      //   where: { id },
      //   include: {
      //     members: {
      //       select: {
      //         id: true,
      //         name: true,
      //         email: true,
      //         phone: true,
      //         relationship: true,
      //         compositeScore: true,
      //         status: true,
      //       },
      //     },
      //   },
      // });

      const household: HouseholdDetail | null = null;

      void id;

      if (!household) {
        reply.code(404);
        return { data: null };
      }

      return { data: household };
    },
  );
}
