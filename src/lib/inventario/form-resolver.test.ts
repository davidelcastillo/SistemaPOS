import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ResolverResult } from "react-hook-form";
import { zodResolver } from "@/lib/inventario/form-resolver";

/** Resolver calls are synchronous here; capture the non-promise result type. */
function resolveSync<T extends Record<string, unknown>>(
  values: T,
  schema: z.ZodTypeAny,
): ResolverResult<T> {
  return zodResolver(schema)(values as never, undefined, {} as never) as ResolverResult<T>;
}

const testSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
  stock: z.number().int().min(0, "Stock no puede ser negativo"),
});

describe("zodResolver", () => {
  it("resolves valid values to the parsed data with empty errors", () => {
    const result = resolveSync({ name: "Remera", price: "120.50", stock: 10 }, testSchema);

    expect(result).toEqual({
      values: { name: "Remera", price: "120.50", stock: 10 },
      errors: {},
    });
  });

  it("maps each Zod issue to its field path with the custom message", () => {
    const result = resolveSync({ name: "", price: "abc", stock: -1 }, testSchema);

    expect(result.values).toEqual({});
    expect(result.errors).toEqual({
      name: { type: "too_small", message: "El nombre es obligatorio" },
      price: { type: "invalid_format", message: "Precio inválido" },
      stock: { type: "too_small", message: "Stock no puede ser negativo" },
    });
  });

  it("reports only the fields that violate the schema", () => {
    const result = resolveSync({ name: "OK", price: "50", stock: 3 }, testSchema);

    expect(result).toEqual({
      values: { name: "OK", price: "50", stock: 3 },
      errors: {},
    });
  });

  it("reports nested field errors with dot paths (attributeGroups)", () => {
    const nested = z.object({
      attributeGroups: z
        .array(
          z.object({
            attributeId: z.string().min(1, "El atributo es obligatorio"),
            valueIds: z.array(z.string()).min(1, "Cada grupo requiere al menos un valor"),
          }),
        )
        .min(1, "Se requiere al menos un grupo de atributos"),
    });

    const result = resolveSync(
      { attributeGroups: [{ attributeId: "", valueIds: [] }] },
      nested,
    );

    expect(result.errors).toEqual({
      "attributeGroups.0.attributeId": {
        type: "too_small",
        message: "El atributo es obligatorio",
      },
      "attributeGroups.0.valueIds": {
        type: "too_small",
        message: "Cada grupo requiere al menos un valor",
      },
    });
  });

  it("reports a root array error when the array itself is empty", () => {
    const nested = z.object({
      attributeGroups: z
        .array(
          z.object({
            attributeId: z.string().min(1, "El atributo es obligatorio"),
            valueIds: z.array(z.string()).min(1, "Cada grupo requiere al menos un valor"),
          }),
        )
        .min(1, "Se requiere al menos un grupo de atributos"),
    });

    const result = resolveSync({ attributeGroups: [] }, nested);

    expect(result.errors).toEqual({
      attributeGroups: {
        type: "too_small",
        message: "Se requiere al menos un grupo de atributos",
      },
    });
  });
});