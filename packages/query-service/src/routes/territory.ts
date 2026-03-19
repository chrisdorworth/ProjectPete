import type { FastifyInstance } from "fastify";

interface TerritoryDetailParams {
  id: string;
}

interface PaginationQueryParams {
  page?: number;
  limit?: number;
}

interface Territory {
  id: string;
  name: string;
  region: string;
  assignedRepId: string | null;
  assignedRepName: string | null;
  leadCount: number;
  capacity: number;
  utilizationPercent: number;
  createdAt: string;
  updatedAt: string;
}

interface TerritoryListResponse {
  data: Territory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface GeoJsonFeature {
  type: "Feature";
  properties: {
    territoryId: string;
    name: string;
    region: string;
    leadCount: number;
    capacity: number;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface TerritoryGeoJsonResponse {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface TerritoryLead {
  id: string;
  name: string;
  compositeScore: number;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TerritoryDetail extends Territory {
  leads: TerritoryLead[];
  boundary: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
}

interface TerritoryDetailResponse {
  data: TerritoryDetail | null;
}

export async function territoryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: PaginationQueryParams; Reply: TerritoryListResponse }>(
    "/",
    async (request, _reply) => {
      const { page = 1, limit = 50 } = request.query;

      // TODO: Prisma query
      // const [territories, total] = await Promise.all([
      //   prisma.territory.findMany({
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     include: {
      //       _count: { select: { leads: true } },
      //       assignedRep: { select: { name: true } },
      //     },
      //   }),
      //   prisma.territory.count(),
      // ]);

      const territories: Territory[] = [];
      const total = 0;

      return {
        data: territories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  );

  fastify.get<{ Reply: TerritoryGeoJsonResponse }>("/map", async (_request, _reply) => {
    // TODO: Prisma query
    // const territories = await prisma.territory.findMany({
    //   include: {
    //     _count: { select: { leads: true } },
    //   },
    // });

    const geoJson: TerritoryGeoJsonResponse = {
      type: "FeatureCollection",
      features: [],
    };

    return geoJson;
  });

  fastify.get<{ Params: TerritoryDetailParams; Reply: TerritoryDetailResponse }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;

      // TODO: Prisma query
      // const territory = await prisma.territory.findUnique({
      //   where: { id },
      //   include: {
      //     leads: {
      //       select: {
      //         id: true,
      //         name: true,
      //         compositeScore: true,
      //         status: true,
      //         address: true,
      //         latitude: true,
      //         longitude: true,
      //       },
      //     },
      //     assignedRep: { select: { name: true } },
      //     _count: { select: { leads: true } },
      //   },
      // });

      const territory: TerritoryDetail | null = null;

      void id;

      if (!territory) {
        reply.code(404);
        return { data: null };
      }

      return { data: territory };
    },
  );
}
