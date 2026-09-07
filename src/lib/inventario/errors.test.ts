import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { mapPrismaError } from "@/lib/inventario/errors";

function p2002(target: string | string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

describe("mapPrismaError (CM-R1 / PM-R2)", () => {
  it("maps a P2002 on sku to DUPLICATE_SKU", () => {
    const result = mapPrismaError(p2002("sku"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SKU");
    }
  });

  it("maps a P2002 on name to DUPLICATE_CATEGORY", () => {
    const result = mapPrismaError(p2002(["name"]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_CATEGORY");
    }
  });

  it("maps any other P2002 target to VALIDATION_ERROR", () => {
    const result = mapPrismaError(p2002(["email"]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("maps a non-P2002 error to VALIDATION_ERROR", () => {
    const generic = new Error("boom");
    const result = mapPrismaError(generic);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});