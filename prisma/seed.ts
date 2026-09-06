import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

/**
 * Seed — first admin user (HU-1.1).
 *
 * Idempotent: if a user with the seed email already exists, the script skips
 * creation so re-runs never duplicate the admin (R-7).
 */
const ADMIN_EMAIL = "admin@pos.com";
const ADMIN_PASSWORD = "admin123";
const BCRYPT_ROUNDS = 10;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`Seed: admin ${ADMIN_EMAIL} already exists, skipping.`);
    return;
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Admin",
      password,
      role: "admin",
    },
  });

  console.log(`Seed: created first admin ${ADMIN_EMAIL}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });