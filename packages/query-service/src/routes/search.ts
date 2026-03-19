import type { FastifyInstance } from "fastify";

interface SearchQueryParams {
  q: string;
  page?: number;
  limit?: number;
}

interface SearchResult {
  id: string;
  type: "lead" | "household" | "signal";
  name: string;
  snippet: string;
  score: number;
  highlights: string[];
  metadata: Record<string, unknown>;
}

interface SearchResponse {
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  query: string;
  searchTimeMs: number;
}

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: SearchQueryParams; Reply: SearchResponse }>(
    "/",
    async (request, reply) => {
      const { q, page = 1, limit = 20 } = request.query;

      if (!q || q.trim().length === 0) {
        reply.code(400);
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          query: "",
          searchTimeMs: 0,
        };
      }

      const startTime = Date.now();

      // TODO: Full-text search + semantic search
      // 1. Full-text search via Prisma raw query or search extension
      // const fullTextResults = await prisma.$queryRaw`
      //   SELECT id, name, ts_rank(search_vector, plainto_tsquery(${q})) AS rank
      //   FROM leads
      //   WHERE search_vector @@ plainto_tsquery(${q})
      //   ORDER BY rank DESC
      //   LIMIT ${limit} OFFSET ${(page - 1) * limit}
      // `;
      //
      // 2. Semantic search via vector similarity
      // const embedding = await generateEmbedding(q);
      // const semanticResults = await prisma.$queryRaw`
      //   SELECT id, name, 1 - (embedding <=> ${embedding}::vector) AS similarity
      //   FROM leads
      //   WHERE 1 - (embedding <=> ${embedding}::vector) > 0.7
      //   ORDER BY similarity DESC
      //   LIMIT ${limit}
      // `;
      //
      // 3. Merge and deduplicate results

      const results: SearchResult[] = [];
      const total = 0;
      const searchTimeMs = Date.now() - startTime;

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        query: q,
        searchTimeMs,
      };
    },
  );
}
