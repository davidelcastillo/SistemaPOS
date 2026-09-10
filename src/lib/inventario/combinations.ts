/**
 * Variant matrix helpers — pure functions.
 * The product form sends N×M attribute groups; the server re-derives the
 * Cartesian product and zips it by index with the submitted variants.
 */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateCombinations(
  groups: { attributeId: string; valueIds: string[] }[],
): string[][] {
  return groups.reduce<string[][]>(
    (acc, group) => acc.flatMap((combo) => group.valueIds.map((valueId) => [...combo, valueId])),
    [[]],
  );
}

export function buildSku(template: string, values: string[]): string {
  const base = slugify(template);
  const combo = values.map(slugify).join("-");
  return combo ? `${base}-${combo}` : base;
}