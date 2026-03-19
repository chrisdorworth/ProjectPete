import type { FastifyInstance } from "fastify";

interface LeadIdParams {
  leadId: string;
}

interface MeetingBriefSignal {
  type: string;
  source: string;
  value: string;
  capturedAt: string;
}

interface MeetingBriefOutreach {
  channel: string;
  status: string;
  sentAt: string;
  openedAt: string | null;
  repliedAt: string | null;
}

interface MeetingBriefConnection {
  name: string;
  relationship: string;
  warmthScore: number;
}

interface MeetingBrief {
  leadId: string;
  leadName: string;
  compositeScore: number;
  status: string;
  county: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  household: {
    id: string;
    memberCount: number;
    members: { name: string; relationship: string }[];
  } | null;
  recentSignals: MeetingBriefSignal[];
  outreachHistory: MeetingBriefOutreach[];
  warmConnections: MeetingBriefConnection[];
  talkingPoints: string[];
  riskFactors: string[];
  generatedAt: string;
}

interface MeetingBriefResponse {
  data: MeetingBrief | null;
}

export async function meetingPrepRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: LeadIdParams; Reply: MeetingBriefResponse }>(
    "/:leadId",
    async (request, reply) => {
      const { leadId } = request.params;

      // TODO: Prisma query
      // const lead = await prisma.lead.findUnique({
      //   where: { id: leadId },
      //   include: {
      //     signals: { orderBy: { capturedAt: "desc" }, take: 10 },
      //     outreachAttempts: { orderBy: { sentAt: "desc" }, take: 5 },
      //     household: { include: { members: true } },
      //     connections: {
      //       include: { targetLead: true },
      //       orderBy: { warmthScore: "desc" },
      //       take: 5,
      //     },
      //   },
      // });

      // TODO: Generate talking points and risk factors via AI or rule engine

      const brief: MeetingBrief | null = null;

      void leadId;

      if (!brief) {
        reply.code(404);
        return { data: null };
      }

      return { data: brief };
    },
  );

  fastify.get<{ Params: LeadIdParams }>(
    "/:leadId/pdf",
    async (request, reply) => {
      const { leadId } = request.params;

      // TODO: Prisma query - fetch same data as meeting brief
      // TODO: Generate PDF using a library like pdfkit or puppeteer
      // const brief = await buildMeetingBrief(leadId);
      // const pdfBuffer = await generateMeetingBriefPdf(brief);

      void leadId;

      // TODO: Replace with actual PDF generation
      const pdfBuffer = Buffer.from("placeholder-pdf-content");

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="meeting-brief-${leadId}.pdf"`,
      );

      return reply.send(pdfBuffer);
    },
  );
}
