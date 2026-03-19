import type { PrismaClient } from "@prisma/client";

export class IdempotencyGuard {
  constructor(private readonly prisma: PrismaClient) {}

  async isDuplicate(key: string): Promise<boolean> {
    const existing = await this.prisma.event.findUnique({
      where: { idempotencyKey: key },
      select: { id: true },
    });
    return existing !== null;
  }

  async getExistingEventId(key: string): Promise<string | null> {
    const existing = await this.prisma.event.findUnique({
      where: { idempotencyKey: key },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
}
