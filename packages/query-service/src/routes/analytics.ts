import type { FastifyInstance } from "fastify";

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

interface FunnelResponse {
  data: FunnelStage[];
}

interface RoiMetrics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageDealValue: number;
  totalRevenue: number;
  costPerLead: number;
  costPerConversion: number;
  roi: number;
  period: string;
}

interface RoiResponse {
  data: RoiMetrics;
}

interface SourcePerformance {
  source: string;
  leadCount: number;
  conversionRate: number;
  averageScore: number;
  averageTimeToConvert: number;
}

interface SourcesResponse {
  data: SourcePerformance[];
}

interface CohortEntry {
  cohort: string;
  size: number;
  retentionByWeek: number[];
  conversionRate: number;
  averageScore: number;
}

interface CohortResponse {
  data: CohortEntry[];
}

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Reply: FunnelResponse }>("/funnel", async (_request, _reply) => {
    // TODO: Prisma query
    // const stages = await prisma.lead.groupBy({
    //   by: ["status"],
    //   _count: { id: true },
    // });

    const stages: FunnelStage[] = [
      { stage: "new", count: 0, conversionRate: 0 },
      { stage: "contacted", count: 0, conversionRate: 0 },
      { stage: "qualified", count: 0, conversionRate: 0 },
      { stage: "proposal", count: 0, conversionRate: 0 },
      { stage: "negotiation", count: 0, conversionRate: 0 },
      { stage: "closed_won", count: 0, conversionRate: 0 },
      { stage: "closed_lost", count: 0, conversionRate: 0 },
    ];

    return { data: stages };
  });

  fastify.get<{ Reply: RoiResponse }>("/roi", async (_request, _reply) => {
    // TODO: Prisma query
    // Aggregate lead counts, conversion rates, deal values, costs

    const metrics: RoiMetrics = {
      totalLeads: 0,
      convertedLeads: 0,
      conversionRate: 0,
      averageDealValue: 0,
      totalRevenue: 0,
      costPerLead: 0,
      costPerConversion: 0,
      roi: 0,
      period: "last_30_days",
    };

    return { data: metrics };
  });

  fastify.get<{ Reply: SourcesResponse }>("/sources", async (_request, _reply) => {
    // TODO: Prisma query
    // Aggregate signal source performance metrics
    // const sources = await prisma.signal.groupBy({
    //   by: ["source"],
    //   _count: { id: true },
    //   _avg: { confidence: true },
    // });

    const sources: SourcePerformance[] = [];

    return { data: sources };
  });

  fastify.get<{ Reply: CohortResponse }>("/cohort", async (_request, _reply) => {
    // TODO: Prisma query
    // Group leads by creation week/month cohort and compute retention/conversion

    const cohorts: CohortEntry[] = [];

    return { data: cohorts };
  });
}
