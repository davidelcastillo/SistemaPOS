import { describe, expect, it } from "vitest";
import { generateCombinations, buildSku } from "@/lib/inventario/combinations";

describe("generateCombinations (PM-R1)", () => {
  it("builds 4 combos from a 2x2 matrix", () => {
    const groups = [
      { attributeId: "attr-color", valueIds: ["v-rojo", "v-azul"] },
      { attributeId: "attr-talle", valueIds: ["v-s", "v-m"] },
    ];
    const combos = generateCombinations(groups);
    expect(combos).toHaveLength(4);
    expect(combos).toEqual([
      ["v-rojo", "v-s"],
      ["v-rojo", "v-m"],
      ["v-azul", "v-s"],
      ["v-azul", "v-m"],
    ]);
  });

  it("builds 6 combos from a 2x3 matrix", () => {
    const groups = [
      { attributeId: "attr-color", valueIds: ["v-rojo", "v-azul"] },
      { attributeId: "attr-talle", valueIds: ["v-s", "v-m", "v-l"] },
    ];
    expect(generateCombinations(groups)).toHaveLength(6);
  });

  it("builds 1 combo per value when there is a single group", () => {
    const groups = [{ attributeId: "attr-color", valueIds: ["v-rojo", "v-azul"] }];
    expect(generateCombinations(groups)).toEqual([["v-rojo"], ["v-azul"]]);
  });

  it("returns a single empty combo when there are no groups", () => {
    expect(generateCombinations([])).toEqual([[]]);
  });
});

describe("buildSku (PM-R1)", () => {
  it("joins slugified template and combo values", () => {
    expect(buildSku("Remera", ["Rojo", "S"])).toBe("remera-rojo-s");
  });

  it("strips accents and collapses spaces into dashes", () => {
    expect(buildSku("Camiseta Azúl", ["Verde"])).toBe("camiseta-azul-verde");
  });

  it("lowercases the template and values", () => {
    expect(buildSku("REMERA", ["NEGRA"])).toBe("remera-negra");
  });
});