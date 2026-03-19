import type { FastifyInstance } from "fastify";

interface CrawlerNameParams {
  name: string;
}

interface CrawlersQueryParams {
  page?: number;
  limit?: number;
}

interface Crawler {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: "success" | "failure" | "running" | null;
  lastRunDurationMs: number | null;
  recordsProcessed: number | null;
}

interface CrawlersResponse {
  data: Crawler[];
}

interface CrawlerRun {
  id: string;
  crawlerName: string;
  status: "success" | "failure" | "running";
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage: string | null;
}

interface CrawlerRunsResponse {
  data: CrawlerRun[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function crawlersRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: CrawlersResponse }>("/", async (_request, _reply) => {
    // TODO: Prisma query
    // const crawlers = await prisma.crawler.findMany({
    //   orderBy: { name: "asc" },
    //   include: {
    //     runs: {
    //       take: 1,
    //       orderBy: { startedAt: "desc" },
    //     },
    //   },
    // });

    const crawlers: Crawler[] = [];

    return { data: crawlers };
  });

  fastify.get<{ Params: CrawlerNameParams; Querystring: CrawlersQueryParams; Reply: CrawlerRunsResponse }>(
    "/:name/runs",
    async (request, reply) => {
      const { name } = request.params;
      const { page = 1, limit = 20 } = request.query;

      // TODO: Prisma query
      // const [runs, total] = await Promise.all([
      //   prisma.crawlerRun.findMany({
      //     where: { crawlerName: name },
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { startedAt: "desc" },
      //   }),
      //   prisma.crawlerRun.count({ where: { crawlerName: name } }),
      // ]);

      const runs: CrawlerRun[] = [];
      const total = 0;

      void name;
      void reply;

      return {
        data: runs,
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
