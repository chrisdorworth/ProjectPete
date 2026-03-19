import type { FastifyInstance } from "fastify";

interface LeadIdParams {
  leadId: string;
}

interface WarmPathConnection {
  id: string;
  name: string;
  relationship: string;
  mutualConnections: number;
  warmthScore: number;
}

interface WarmPath {
  targetLeadId: string;
  paths: {
    hops: WarmPathConnection[];
    totalWarmth: number;
  }[];
}

interface WarmPathsResponse {
  data: WarmPath;
}

interface NetworkNode {
  id: string;
  label: string;
  type: string;
  score: number;
  x?: number;
  y?: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

interface NetworkVisualization {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface NetworkResponse {
  data: NetworkVisualization;
}

interface ProximityScore {
  leadId: string;
  score: number;
  directConnections: number;
  secondDegreeConnections: number;
  sharedAttributes: string[];
}

interface ProximityResponse {
  data: ProximityScore;
}

export async function graphRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: LeadIdParams; Reply: WarmPathsResponse }>(
    "/warm-paths/:leadId",
    async (request, reply) => {
      const { leadId } = request.params;

      // TODO: Prisma query + graph traversal
      // Query relationships and compute warm introduction paths
      // using breadth-first search through the connection graph

      const warmPath: WarmPath = {
        targetLeadId: leadId,
        paths: [],
      };

      void reply;

      return { data: warmPath };
    },
  );

  fastify.get<{ Params: LeadIdParams; Reply: NetworkResponse }>(
    "/network/:leadId",
    async (request, reply) => {
      const { leadId } = request.params;

      // TODO: Prisma query
      // Fetch lead's network connections for visualization
      // const connections = await prisma.connection.findMany({
      //   where: {
      //     OR: [{ sourceLeadId: leadId }, { targetLeadId: leadId }],
      //   },
      //   include: { sourceLead: true, targetLead: true },
      // });

      const network: NetworkVisualization = {
        nodes: [],
        edges: [],
      };

      void leadId;
      void reply;

      return { data: network };
    },
  );

  fastify.get<{ Params: LeadIdParams; Reply: ProximityResponse }>(
    "/proximity/:leadId",
    async (request, reply) => {
      const { leadId } = request.params;

      // TODO: Prisma query + proximity calculation
      // Compute network proximity score based on connections,
      // shared attributes, and geographic closeness

      const proximity: ProximityScore = {
        leadId,
        score: 0,
        directConnections: 0,
        secondDegreeConnections: 0,
        sharedAttributes: [],
      };

      void reply;

      return { data: proximity };
    },
  );
}
