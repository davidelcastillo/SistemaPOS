import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Cashier fixture for the E2E login flow (HU-1.1, R-5).
 *
 * Run via `tsx` (ESM-capable, like prisma/seed.ts) because the generated
 * Prisma client is ESM-only and Playwright's CJS transform cannot load it.
 * Invoked from e2e/auth.spec.mts with `create` | `remove`.
 */
const CASHIER_EMAIL = "cashier.e2e@pos.com";
const CASHIER_PASSWORD = "cashier123";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const command = process.argv[2];

async function main() {
  if (command === "create") {
    const existing = await prisma.user.findUnique({
      where: { email: CASHIER_EMAIL },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: CASHIER_EMAIL,
          name: "Cashier E2E",
          password: await bcrypt.hash(CASHIER_PASSWORD, 10),
          role: "cashier",
        },
      });
      console.log(`Fixture: created cashier ${CASHIER_EMAIL}.`);
    }
  } else if (command === "remove") {
    await prisma.user.deleteMany({ where: { email: CASHIER_EMAIL } });
    console.log(`Fixture: removed cashier ${CASHIER_EMAIL}.`);
  }
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