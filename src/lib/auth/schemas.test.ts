import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/auth/schemas";

describe("registerSchema (data contract: auth module)", () => {
  const validPayload = {
    name: "Cajero Uno",
    email: "cajero1@pos.com",
    password: "secreto123",
    role: "cashier",
  };

  it("accepts a valid admin/cashier payload", () => {
    const parsed = registerSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(validPayload);
    }
  });

  it("rejects an invalid email", () => {
    const parsed = registerSchema.safeParse({
      ...validPayload,
      email: "no-es-email",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const parsed = registerSchema.safeParse({
      ...validPayload,
      password: "corta",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const parsed = registerSchema.safeParse({
      ...validPayload,
      name: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a role outside the union", () => {
    const parsed = registerSchema.safeParse({
      ...validPayload,
      role: "superuser",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a payload missing the role field", () => {
    const withoutRole = { name: validPayload.name, email: validPayload.email, password: validPayload.password };
    const parsed = registerSchema.safeParse(withoutRole);
    expect(parsed.success).toBe(false);
  });
});