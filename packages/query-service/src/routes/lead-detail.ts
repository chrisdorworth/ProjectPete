import type { FastifyInstance } from "fastify";

interface LeadDetailParams {
  id: string;
}

interface Signal {
  id: string;
  type: string;
  source: string;
  value: string;
  confidence: number;
  capturedAt: string;
}

interface Enrichment {
  id: string;
  provider: string;
  field: string;
  value: string;
  enrichedAt: string;
}

interface OutreachAttempt {
  id: string;
  channel: string;
  status: string;
  sentAt: string;
  openedAt: string | null;
  repliedAt: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

interface HouseholdMember {
  id: string;
  name: string;
  relationship: string;
}

interface LeadDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  county: string;
  status: string;
  compositeScore: number;
  assignedRepId: string | null;
  householdId: string | null;
  createdAt: string;
  updatedAt: string;
  signals: Signal[];
  enrichments: Enrichment[];
  outreachAttempts: OutreachAttempt[];
  timeline: TimelineEvent[];
  household: {
    id: string;
    members: HouseholdMember[];
  } | null;
}

interface LeadDetailResponse {
  data: LeadDetail | null;
}

export async function leadDetailRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: LeadDetailParams; Reply: LeadDetailResponse }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;

      // TODO: Prisma query
      // const lead = await prisma.lead.findUnique({
      //   where: { id },
      //   include: {
      //     signals: true,
      //     enrichments: true,
      //     outreachAttempts: {
      //       orderBy: { sentAt: "desc" },
      //     },
      //     timeline: {
      //       orderBy: { occurredAt: "desc" },
      //     },
      //     household: {
      //       include: {
      //         members: true,
      //       },
      //     },
      //   },
      // });

      const lead: LeadDetail | null = null;

      void id;

      if (!lead) {
        reply.code(404);
        return { data: null };
      }

      return { data: lead };
    },
  );
}
