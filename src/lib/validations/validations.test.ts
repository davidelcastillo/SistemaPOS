import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validations/auth";
import { paginationSchema } from "@/lib/validations/pagination";
import { paymentMethodSchema, purchasePaymentMethodSchema } from "@/lib/validations/payment";
import { cuidSchema } from "@/lib/validations/ids";
import { success, failure, isErrorCode } from "@/lib/validations/result";

describe("loginSchema (data contract: auth)", () => {
  it("accepts a valid email and password", () => {
    const parsed = loginSchema.safeParse({ email: "admin@pos.com", password: "secreto" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("admin@pos.com");
      expect(parsed.data.password).toBe("secreto");
    }
  });

  it("rejects an invalid email with a descriptive message", () => {
    const parsed = loginSchema.safeParse({ email: "no-es-email", password: "x" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === "email");
      expect(emailIssue).toBeDefined();
      expect(emailIssue?.message).toBe("Ingresá un email válido");
    }
  });

  it("rejects an empty password with the invalid-credentials message", () => {
    const parsed = loginSchema.safeParse({ email: "admin@pos.com", password: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const passIssue = parsed.error.issues.find((issue) => issue.path[0] === "password");
      expect(passIssue?.message).toBe("Credenciales inválidas");
    }
  });
});

describe("paginationSchema (data contract: pagination)", () => {
  it("applies default page and pageSize when omitted", () => {
    const parsed = paginationSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.pageSize).toBe(10);
    }
  });

  it("keeps explicit page and pageSize values", () => {
    const parsed = paginationSchema.safeParse({ page: 3, pageSize: 25 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(3);
      expect(parsed.data.pageSize).toBe(25);
    }
  });

  it("rejects pageSize above the max bound", () => {
    const parsed = paginationSchema.safeParse({ page: 1, pageSize: 500 });
    expect(parsed.success).toBe(false);
  });
});

describe("payment enums (data contract: payment)", () => {
  it("accepts every PaymentMethod sale value", () => {
    for (const value of ["CASH", "MP_TRANSFER", "MP_POSNET"] as const) {
      expect(paymentMethodSchema.safeParse(value).success).toBe(true);
    }
  });

  it("rejects a purchase-only method in the sale enum", () => {
    expect(paymentMethodSchema.safeParse("TRANSFER").success).toBe(false);
  });

  it("accepts every PurchasePaymentMethod value", () => {
    for (const value of ["CASH", "TRANSFER"] as const) {
      expect(purchasePaymentMethodSchema.safeParse(value).success).toBe(true);
    }
  });

  it("rejects a sale-only method in the purchase enum", () => {
    expect(purchasePaymentMethodSchema.safeParse("MP_POSNET").success).toBe(false);
  });
});

describe("cuidSchema (data contract: ids)", () => {
  it("accepts a valid cuid", () => {
    expect(cuidSchema.safeParse("ckz8v1x2y0000abc123def456").success).toBe(true);
  });

  it("rejects a non-cuid string", () => {
    expect(cuidSchema.safeParse("not-a-cuid").success).toBe(false);
  });
});

describe("ActionResult<T> (data contract: result)", () => {
  it("builds a typed success result", () => {
    const result = success({ total: 100 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(100);
    }
  });

  it("builds a typed failure result with an ErrorCode", () => {
    const result = failure("STOCK_INSUFFICIENT", "No hay stock suficiente");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STOCK_INSUFFICIENT");
      expect(result.error.message).toBe("No hay stock suficiente");
      expect(isErrorCode(result.error.code)).toBe(true);
    }
  });

  it("recognizes every ErrorCode as valid", () => {
    const codes = [
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "CASH_REGISTER_CLOSED",
      "STOCK_INSUFFICIENT",
      "DUPLICATE_CATEGORY",
      "DUPLICATE_SKU",
      "NOT_FOUND",
    ] as const;
    for (const code of codes) {
      expect(isErrorCode(code)).toBe(true);
    }
  });

  it("rejects an unknown code", () => {
    expect(isErrorCode("UNKNOWN_CODE")).toBe(false);
  });
});