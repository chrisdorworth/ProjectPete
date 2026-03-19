import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

export const outreachProjection: Projection = {
  name: "outreach",
  handledEvents: [
    "DraftGenerated", "ComplianceReviewed", "OutreachQueued",
    "OutreachSent", "OutreachDelivered", "OutreachOpened",
    "OutreachClicked", "OutreachReplied", "OutreachBounced", "OutreachUnsubscribed",
  ],

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.eventType) {
      case "DraftGenerated":
        await prisma.outreachAttempt.create({
          data: {
            id: event.id,
            leadId: p["leadId"] as string,
            channel: p["channel"] as string,
            status: "draft",
            draftContent: p["content"] as string,
            draftVariant: p["variant"] as string,
          },
        });
        break;

      case "ComplianceReviewed": {
        const status = p["status"] as string;
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: {
            complianceStatus: status,
            complianceReviewedAt: event.createdAt,
            status: status === "approved" ? "approved" : "draft",
          },
        });
        break;
      }

      case "OutreachQueued":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { status: "queued" },
        });
        break;

      case "OutreachSent":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: {
            status: "sent",
            sentAt: event.createdAt,
            externalMessageId: p["externalMessageId"] as string | null,
          },
        });
        break;

      case "OutreachDelivered":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { deliveredAt: event.createdAt },
        });
        break;

      case "OutreachOpened":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { openedAt: event.createdAt },
        });
        break;

      case "OutreachClicked":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { clickedAt: event.createdAt },
        });
        break;

      case "OutreachReplied":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { repliedAt: event.createdAt },
        });
        break;

      case "OutreachBounced":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { bouncedAt: event.createdAt, status: "bounced" as string },
        });
        break;

      case "OutreachUnsubscribed":
        await prisma.outreachAttempt.update({
          where: { id: p["outreachId"] as string },
          data: { unsubscribedAt: event.createdAt },
        });
        break;
    }
  },
};
