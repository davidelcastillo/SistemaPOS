import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Inline react-hook-form ↔ Zod v4 resolver.
 *
 * `@hookform/resolvers` is intentionally NOT installed (package.json is a hot
 * file), so the forms resolve through this small adapter. It mirrors the
 * `Resolver<TFieldValues>` contract: on failure it maps every Zod issue to a
 * dotted field path (e.g. `attributeGroups.0.attributeId`) with the schema
 * message, on success it returns the parsed data with empty errors.
 *
 * The return type is the base `Resolver` (values typed as `FieldValues`); the
 * concrete `useForm<z.infer<T>>` call in each form ties the schema to the form
 * values, keeping the adapter generic without fighting zod v4's `unknown`
 * output against RHF's `FieldValues` constraint.
 */
export function zodResolver<T extends z.ZodTypeAny>(schema: T): Resolver {
  return (values: unknown) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data as never, errors: {} };
    }

    const errors: FieldErrors<FieldValues> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      errors[key] = { type: issue.code, message: issue.message };
    }

    return { values: {}, errors: errors as never };
  };
}