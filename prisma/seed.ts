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

const CASHIER_EMAIL = "cajero@pos.com";
const CASHIER_PASSWORD = "cajero123";

/** Mini catálogo de desarrollo (smoke/UX) — idempotente. */
const CATEGORIES = ["Remeras", "Pantalones", "Accesorios"] as const;

const ATTRIBUTES = [
  { name: "Color", values: ["Negro", "Blanco", "Rojo", "Azul"] },
  { name: "Talle", values: ["S", "M", "L", "XL"] },
] as const;

interface MiniVariant {
  sku: string;
  salePrice: number;
  stock: number;
  color: string;
  size: string | null;
}

interface MiniProduct {
  name: string;
  description: string;
  basePrice: number;
  category: string;
  variants: MiniVariant[];
}

const PRODUCTS: MiniProduct[] = [
  {
    name: "Remera Lana",
    description: "Remera de lana premium, corte regular.",
    basePrice: 24999,
    category: "Remeras",
    variants: [
      { sku: "RL-NEG-M", salePrice: 27999, stock: 12, color: "Negro", size: "M" },
      { sku: "RL-NEG-L", salePrice: 27999, stock: 8, color: "Negro", size: "L" },
      { sku: "RL-BLA-M", salePrice: 27999, stock: 10, color: "Blanco", size: "M" },
      { sku: "RL-ROJ-S", salePrice: 27999, stock: 6, color: "Rojo", size: "S" },
    ],
  },
  {
    name: "Pantalón Chino",
    description: "Pantalón chino slim, tela sarga.",
    basePrice: 32999,
    category: "Pantalones",
    variants: [
      { sku: "PC-NEG-S", salePrice: 35999, stock: 9, color: "Negro", size: "S" },
      { sku: "PC-NEG-M", salePrice: 35999, stock: 14, color: "Negro", size: "M" },
      { sku: "PC-AZU-L", salePrice: 35999, stock: 7, color: "Azul", size: "L" },
    ],
  },
  {
    name: "Gorra Trucker",
    description: "Gorra trucker con visera curva.",
    basePrice: 12999,
    category: "Accesorios",
    variants: [
      { sku: "GT-NEG", salePrice: 13999, stock: 20, color: "Negro", size: null },
      { sku: "GT-BLA", salePrice: 13999, stock: 15, color: "Blanco", size: null },
    ],
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Crea (o reusa) un atributo con sus valores; devuelve el map value → id. */
async function ensureAttribute(
  prisma: PrismaClient,
  name: string,
  values: readonly string[],
): Promise<Record<string, string>> {
  const attribute = await prisma.attribute.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  const valueMap: Record<string, string> = {};
  for (const value of values) {
    const av = await prisma.attributeValue.upsert({
      where: { attributeId_value: { attributeId: attribute.id, value } },
      update: {},
      create: { value, attributeId: attribute.id },
    });
    valueMap[value] = av.id;
  }
  return valueMap;
}

/** Mini catálogo: categorías + atributos + productos con variantes. Idempotente. */
async function seedCatalog(prisma: PrismaClient) {
  const categories: Record<string, string> = {};
  for (const name of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `Categoría ${name}` },
    });
    categories[name] = cat.id;
  }

  const colorValues = await ensureAttribute(prisma, "Color", ATTRIBUTES[0].values);
  const sizeValues = await ensureAttribute(prisma, "Talle", ATTRIBUTES[1].values);

  for (const p of PRODUCTS) {
    let product = await prisma.product.findFirst({
      where: { name: p.name, categoryId: categories[p.category] },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          basePrice: p.basePrice,
          categoryId: categories[p.category],
        },
      });
      console.log(`Seed: created product ${p.name}.`);
    }

    for (const v of p.variants) {
      const variant = await prisma.variant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          sku: v.sku,
          salePrice: v.salePrice,
          stock: v.stock,
          productId: product.id,
        },
      });
      const colorId = colorValues[v.color];
      if (colorId) {
        await prisma.variantAttribute.upsert({
          where: {
            variantId_attributeValueId: { variantId: variant.id, attributeValueId: colorId },
          },
          update: {},
          create: { variantId: variant.id, attributeValueId: colorId },
        });
      }
      if (v.size) {
        const sizeId = sizeValues[v.size];
        if (sizeId) {
          await prisma.variantAttribute.upsert({
            where: {
              variantId_attributeValueId: { variantId: variant.id, attributeValueId: sizeId },
            },
            update: {},
            create: { variantId: variant.id, attributeValueId: sizeId },
          });
        }
      }
    }
  }
}

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`Seed: admin ${ADMIN_EMAIL} already exists, skipping.`);
  } else {
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

  // Cajero de prueba (rol cashier).
  const cashier = await prisma.user.findUnique({ where: { email: CASHIER_EMAIL } });
  if (!cashier) {
    const password = await bcrypt.hash(CASHIER_PASSWORD, BCRYPT_ROUNDS);
    await prisma.user.create({
      data: {
        email: CASHIER_EMAIL,
        name: "Cajero",
        password,
        role: "cashier",
      },
    });
    console.log(`Seed: created cashier ${CASHIER_EMAIL}.`);
  }

  await seedCatalog(prisma);
  console.log("Seed: mini catalog ready (categories, attributes, products, variants).");
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