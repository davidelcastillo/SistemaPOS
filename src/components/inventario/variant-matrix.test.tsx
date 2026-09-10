import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VariantMatrix, cartesianCombinations } from "@/components/inventario/variant-matrix";
import type { VariantComboInput } from "@/lib/inventario/schemas";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("cartesianCombinations — N×M matrix (task 3.2)", () => {
  it("generates the full Cartesian product of two groups (2×2 = 4)", () => {
    const out = cartesianCombinations([
      { attributeId: "color", valueIds: ["rojo", "azul"] },
      { attributeId: "talle", valueIds: ["s", "m"] },
    ]);

    expect(out).toHaveLength(4);
    expect(out).toEqual([
      ["rojo", "s"],
      ["rojo", "m"],
      ["azul", "s"],
      ["azul", "m"],
    ]);
  });

  it("generates a single row for one group with one value", () => {
    const out = cartesianCombinations([{ attributeId: "a", valueIds: ["x"] }]);

    expect(out).toEqual([["x"]]);
  });

  it("returns an empty matrix when there are no groups", () => {
    expect(cartesianCombinations([])).toEqual([]);
  });
});

describe("VariantMatrix", () => {
  const groups = [
    { attributeId: "color", valueIds: ["rojo", "azul"] },
    { attributeId: "talle", valueIds: ["s", "m"] },
  ];

  it("renders one row per Cartesian combination with price and stock inputs (length == |cartesian|)", () => {
    render(<VariantMatrix groups={groups} skuTemplate="remera" variants={[]} onChange={vi.fn()} />);

    // 4 combos × 2 editable inputs (price, stock) + the read-only template field
    expect(screen.getByLabelText(/template de sku/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/precio/i)).toHaveLength(4);
    expect(screen.getAllByLabelText(/stock/i)).toHaveLength(4);
    expect(screen.getByText("rojo / s")).toBeInTheDocument();
    expect(screen.getByText("azul / m")).toBeInTheDocument();
  });

  it("reports a variant row per combo via onChange after the user fills price and stock", () => {
    const onChange = vi.fn();
    const { container } = render(
      <VariantMatrix groups={groups} skuTemplate="remera" variants={[]} onChange={onChange} />,
    );

    const priceInputs = container.querySelectorAll<HTMLInputElement>('input[aria-label*="precio"]');
    const stockInputs = container.querySelectorAll<HTMLInputElement>('input[aria-label*="stock"]');
    expect(priceInputs).toHaveLength(4);

    priceInputs.forEach((el, i) => {
      fireEvent.input(el, { target: { value: `${100 + i}.00` } });
    });
    stockInputs.forEach((el) => {
      fireEvent.input(el, { target: { value: "5" } });
    });

    const lastCall = onChange.mock.calls.at(-1)?.[0] as VariantComboInput[];
    expect(lastCall).toHaveLength(4);
    expect(lastCall[0]).toMatchObject({
      attributeValueIds: ["rojo", "s"],
      salePrice: "100.00",
      stock: 5,
    });
    expect(lastCall[3]).toMatchObject({
      attributeValueIds: ["azul", "m"],
      salePrice: "103.00",
      stock: 5,
    });
  });

  it("shows an empty state when there are no attribute groups", () => {
    render(<VariantMatrix groups={[]} skuTemplate="remera" variants={[]} onChange={vi.fn()} />);

    expect(screen.getByText(/agregá al menos un grupo/i)).toBeInTheDocument();
  });
});