"use client";

import { useEffect, useState } from "react";
import type { VariantComboInput } from "@/lib/inventario/schemas";

export interface AttributeGroupInput {
  attributeId: string;
  valueIds: string[];
}

/**
 * Cartesian product of attribute groups (N×M variant matrix). Order follows
 * the backend contract: `generateCombinations(attributeGroups)` output, so the
 * submitted `variants` array zips by index (design decision A1).
 */
export function cartesianCombinations(groups: AttributeGroupInput[]): string[][] {
  if (groups.length === 0) return [];
  return groups.reduce<string[][]>(
    (acc, group) => acc.flatMap((combo) => group.valueIds.map((valueId) => [...combo, valueId])),
    [[]],
  );
}

interface VariantMatrixProps {
  groups: AttributeGroupInput[];
  skuTemplate: string;
  variants: VariantComboInput[];
  onChange: (variants: VariantComboInput[]) => void;
}

/**
 * Variant matrix editor — one row per Cartesian combination with per-combo
 * sale price and stock (PM-R1). The parent form owns the attribute groups and
 * the base SKU template; this component only edits the combo-level values and
 * emits the full variants array on every change.
 */
export function VariantMatrix({ groups, skuTemplate, variants, onChange }: VariantMatrixProps) {
  const combos = cartesianCombinations(groups);
  const [rows, setRows] = useState<VariantComboInput[]>(variants);

  // Keep rows in sync with the combos whenever the groups change.
  useEffect(() => {
    setRows(
      combos.map((attributeValueIds, index) => ({
        attributeValueIds,
        salePrice: variants[index]?.salePrice ?? "",
        stock: variants[index]?.stock ?? 0,
      })),
    );
  }, [JSON.stringify(combos)]);

  function updateRow(index: number, patch: Partial<VariantComboInput>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setRows(next);
    onChange(next);
  }

  if (combos.length === 0) {
    return (
      <p className="rounded-[2px] border border-dashed border-[#4A4A4A]/30 px-3 py-4 text-sm text-[#4A4A4A]">
        Agregá al menos un grupo de atributos para generar las variantes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="variant-sku-template" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
          Template de SKU
        </label>
        <input
          id="variant-sku-template"
          value={skuTemplate}
          readOnly
          placeholder="ej: remera"
          className="w-full rounded-[2px] border border-[#4A4A4A]/40 bg-[#1A1A1A]/5 px-3 py-2 text-sm text-[#4A4A4A]"
        />
        <p className="mt-1 text-xs text-[#4A4A4A]">
          El SKU final se arma con el template + la combinación (ej: remera-rojo-s).
        </p>
      </div>

      <div className="overflow-x-auto rounded-[2px] border border-[#4A4A4A]/20">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#4A4A4A]/20 bg-[#1A1A1A] text-left text-[0.75rem] font-medium uppercase tracking-wide text-white">
              <th className="px-3 py-2">Combinación</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {combos.map((combo, index) => (
              <tr key={combo.join("-")} className="border-b border-[#4A4A4A]/10 last:border-b-0">
                <td className="px-3 py-2 font-medium text-[#1A1A1A]">{combo.join(" / ")}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`precio ${combo.join("-")}`}
                    value={rows[index]?.salePrice ?? ""}
                    onChange={(event) => updateRow(index, { salePrice: event.target.value })}
                    placeholder="0.00"
                    className="w-24 rounded-[2px] border border-[#4A4A4A] px-2 py-1.5 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    aria-label={`stock ${combo.join("-")}`}
                    value={rows[index]?.stock ?? 0}
                    onChange={(event) => updateRow(index, { stock: Number(event.target.value) })}
                    className="w-24 rounded-[2px] border border-[#4A4A4A] px-2 py-1.5 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/30"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
