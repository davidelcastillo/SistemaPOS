/**
 * Shared result contract — unified action borders.
 *
 * Every server action / route handler returns `ActionResult<T>` so the UI can
 * branch on `ok` and act on a typed `ErrorCode` (validation, empty states,
 * concurrency, uniqueness, soft-delete).
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CASH_REGISTER_CLOSED"
  | "STOCK_INSUFFICIENT"
  | "DUPLICATE_CATEGORY"
  | "DUPLICATE_SKU"
  | "NOT_FOUND";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

const ERROR_CODES: readonly ErrorCode[] = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CASH_REGISTER_CLOSED",
  "STOCK_INSUFFICIENT",
  "DUPLICATE_CATEGORY",
  "DUPLICATE_SKU",
  "NOT_FOUND",
];

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure<T = never>(
  code: ErrorCode,
  message: string,
): ActionResult<T> {
  return { ok: false, error: { code, message } };
}

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}