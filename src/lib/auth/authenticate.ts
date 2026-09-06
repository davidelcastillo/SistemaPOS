import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Pure credential verification (R-2): Zod validation BEFORE any database
 * access, `findUnique` by email, `bcrypt.compare` (hashes created with 10
 * rounds). Returns `null` for every invalid border so the caller never
 * distinguishes "wrong password" from "unknown email".
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: "admin" | "cashier";
};

export async function authenticate(
  input: unknown,
): Promise<AuthenticatedUser | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(parsed.data.password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role };
}