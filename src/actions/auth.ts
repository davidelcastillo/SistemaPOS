"use server";

/**
 * Auth server actions — Módulo 1 (Auth). Dueño: Auth.
 *
 * Mapa de exposición:
 * - `registerUser` (Server Action) → Vitest integración PostgreSQL
 * - login/logout/sesión → NextAuth `/api/auth/*` + proxy → E2E + Vitest
 */

import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { Prisma } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { registerSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/prisma";
import { failure, success, type ActionResult } from "@/lib/validations/result";

export type RegisterUserResult = {
  id: string;
  email: string;
  role: "admin" | "cashier";
};

/**
 * Creates a user (R-4): admin-only (server-side), Zod validation before any
 * database access, bcrypt hash with 10 rounds. A duplicate email surfaces as
 * `DUPLICATE_EMAIL` from the unique constraint (P2002).
 */
export async function registerUser(
  input: unknown,
): Promise<ActionResult<RegisterUserResult>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return failure("UNAUTHORIZED", "Debés iniciar sesión");
  }
  if (session.user.role !== "admin") {
    return failure("FORBIDDEN", "Solo el admin puede registrar usuarios");
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "Datos inválidos");
  }

  const password = await bcrypt.hash(parsed.data.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password,
        role: parsed.data.role,
      },
    });
    return success({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure("DUPLICATE_EMAIL", "El email ya está registrado");
    }
    throw error;
  }
}