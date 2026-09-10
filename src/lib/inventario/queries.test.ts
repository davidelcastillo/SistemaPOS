import { describe, expect, it } from "vitest";
import { whereActive, paginate } from "@/lib/inventario/queries";

describe("whereActive (SD-R1/R2)", () => {
  it("filters active rows only", () => {
    expect(whereActive).toEqual({ isActive: true });
  });
});

describe("paginate (SE-R1)", () => {
  it("maps page 1 to skip 0", () => {
    expect(paginate(1, 10)).toEqual({ skip: 0, take: 10 });
  });

  it("maps page 3 with pageSize 25 to skip 50", () => {
    expect(paginate(3, 25)).toEqual({ skip: 50, take: 25 });
  });
});