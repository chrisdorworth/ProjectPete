import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding Meridian database...");

  const adminId = randomUUID();
  await prisma.user.upsert({
    where: { email: "admin@meridian.local" },
    update: {},
    create: {
      id: adminId,
      email: "admin@meridian.local",
      // Argon2id hash of "meridian_dev" — replace in production
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+daw",
      name: "Admin User",
      role: "admin",
    },
  });

  const repId = randomUUID();
  await prisma.user.upsert({
    where: { email: "rep@meridian.local" },
    update: {},
    create: {
      id: repId,
      email: "rep@meridian.local",
      passwordHash:
        "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+daw",
      name: "Demo Rep",
      role: "rep",
    },
  });

  await prisma.territory.upsert({
    where: { id: "territory-central-fl" },
    update: {},
    create: {
      id: "territory-central-fl",
      name: "Central Florida",
      repId: repId,
      zipCodes: ["32801", "32803", "32804", "32806", "32807", "32812", "32819", "32822", "32824", "32825"],
      counties: ["Orange", "Seminole", "Osceola"],
      capacityCap: 150,
    },
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
